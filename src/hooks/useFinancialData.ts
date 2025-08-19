import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialPeriod {
  id: number;
  year: number;
  quarter: number;
  entry_count: number;
  mapped_count: number;
  mapping_percentage: number;
  has_data: boolean;
  created_at?: string;
}

export interface TrialBalanceEntry {
  id: number;
  ledger_name: string;
  debit: number | null;
  credit: number | null;
  closing_balance: number | null;
  period_id: number;
  mapping_id?: number;
  parent_group?: string;
  account_type?: string;
  account_category?: string;
  gpt_confidence?: number;
  processing_notes?: string;
}

export interface BalanceSheetData {
  account: string;
  current_amount: number;
  previous_amount?: number;
  variance?: number;
  category: 'ASSETS' | 'LIABILITIES' | 'EQUITY';
}

export interface PLData {
  account: string;
  current_amount: number;
  previous_amount?: number;
  variance?: number;
  category: 'REVENUE' | 'EXPENSES';
}

export const useFinancialData = () => {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [trialBalanceEntries, setTrialBalanceEntries] = useState<TrialBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Fetch financial periods with data availability information
      const { data: periodsData, error: periodsError } = await supabase
        .from('financial_periods_with_data')
        .select('*')
        .eq('has_data', true)
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (periodsError) throw periodsError;

      // Fetch trial balance entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('trial_balance_entries')
        .select(`
          id,
          ledger_name,
          debit,
          credit,
          closing_balance,
          period_id,
          mapping_id,
          parent_group,
          account_type,
          account_category,
          gpt_confidence,
          processing_notes
        `);

      if (entriesError) throw entriesError;

      setPeriods(periodsData || []);
      setTrialBalanceEntries(entriesData || []);
      
      // Auto-select the period with the highest mapping percentage
      if (periodsData && periodsData.length > 0) {
        const bestPeriod = periodsData.reduce((best, current) => {
          return (current.mapping_percentage > best.mapping_percentage) ? current : best;
        });
        setSelectedPeriodId(bestPeriod.id);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBalanceSheetData = (periodId?: number): BalanceSheetData[] => {
    const actualPeriodId = periodId || selectedPeriodId;
    if (!actualPeriodId || trialBalanceEntries.length === 0) return [];

    const periodEntries = trialBalanceEntries.filter(entry => entry.period_id === actualPeriodId);
    
    // Group entries by category based on ledger names
    const assets: BalanceSheetData[] = [];
    const liabilities: BalanceSheetData[] = [];
    const equity: BalanceSheetData[] = [];

    periodEntries.forEach(entry => {
      const amount = entry.closing_balance || ((entry.debit || 0) - (entry.credit || 0));
      
      // Use GPT-categorized account_type if available, otherwise fall back to name matching
      const accountType = entry.account_type?.toUpperCase();
      const ledgerName = entry.ledger_name.toLowerCase();

      if (accountType === 'ASSETS' || ledgerName.includes('asset') || ledgerName.includes('cash') || ledgerName.includes('inventory')) {
        assets.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'ASSETS'
        });
      } else if (accountType === 'LIABILITIES' || ledgerName.includes('liability') || ledgerName.includes('payable') || ledgerName.includes('loan')) {
        liabilities.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'LIABILITIES'
        });
      } else if (accountType === 'EQUITY' || ledgerName.includes('capital') || ledgerName.includes('equity') || ledgerName.includes('reserve')) {
        equity.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'EQUITY'
        });
      }
    });

    return [...assets, ...liabilities, ...equity];
  };

  const getPLData = (periodId?: number): PLData[] => {
    const actualPeriodId = periodId || selectedPeriodId;
    if (!actualPeriodId || trialBalanceEntries.length === 0) return [];

    const periodEntries = trialBalanceEntries.filter(entry => entry.period_id === actualPeriodId);
    
    const revenue: PLData[] = [];
    const expenses: PLData[] = [];

    periodEntries.forEach(entry => {
      const amount = entry.closing_balance || ((entry.credit || 0) - (entry.debit || 0));
      
      // Use GPT-categorized account_type if available, otherwise fall back to name matching
      const accountType = entry.account_type?.toUpperCase();
      const ledgerName = entry.ledger_name.toLowerCase();

      if (accountType === 'REVENUE' || ledgerName.includes('sales') || ledgerName.includes('revenue') || ledgerName.includes('income')) {
        revenue.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'REVENUE'
        });
      } else if (accountType === 'EXPENSES' || ledgerName.includes('expense') || ledgerName.includes('cost') || ledgerName.includes('wages')) {
        expenses.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'EXPENSES'
        });
      }
    });

    return [...revenue, ...expenses];
  };

  const hasData = () => {
    return periods.length > 0 && trialBalanceEntries.length > 0;
  };

  const getTotalAssets = (periodId?: number): number => {
    const balanceSheetData = getBalanceSheetData(periodId || selectedPeriodId);
    return balanceSheetData
      .filter(item => item.category === 'ASSETS')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalLiabilities = (periodId?: number): number => {
    const balanceSheetData = getBalanceSheetData(periodId || selectedPeriodId);
    return balanceSheetData
      .filter(item => item.category === 'LIABILITIES')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalEquity = (periodId?: number): number => {
    const balanceSheetData = getBalanceSheetData(periodId || selectedPeriodId);
    return balanceSheetData
      .filter(item => item.category === 'EQUITY')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalRevenue = (periodId?: number): number => {
    const plData = getPLData(periodId || selectedPeriodId);
    return plData
      .filter(item => item.category === 'REVENUE')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalExpenses = (periodId?: number): number => {
    const plData = getPLData(periodId || selectedPeriodId);
    return plData
      .filter(item => item.category === 'EXPENSES')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getCurrentPeriod = () => {
    if (!selectedPeriodId || periods.length === 0) return null;
    return periods.find(p => p.id === selectedPeriodId) || periods[0];
  };

  return {
    periods,
    trialBalanceEntries,
    loading,
    hasData,
    selectedPeriodId,
    setSelectedPeriodId,
    getCurrentPeriod,
    getBalanceSheetData,
    getPLData,
    getTotalAssets,
    getTotalLiabilities,
    getTotalEquity,
    getTotalRevenue,
    getTotalExpenses,
    refetch: fetchFinancialData
  };
};