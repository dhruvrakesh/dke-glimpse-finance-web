import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialPeriod {
  id: number;
  year: number;
  quarter: number;
  created_at?: string;
}

export interface TrialBalanceEntry {
  id: number;
  ledger_name: string;
  debit: number | null;
  credit: number | null;
  period_id: number;
  mapping_id?: number;
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

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Fetch financial periods
      const { data: periodsData, error: periodsError } = await supabase
        .from('financial_periods')
        .select('*')
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
          period_id,
          mapping_id
        `);

      if (entriesError) throw entriesError;

      setPeriods(periodsData || []);
      setTrialBalanceEntries(entriesData || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBalanceSheetData = (periodId?: number): BalanceSheetData[] => {
    if (!periodId || trialBalanceEntries.length === 0) return [];

    const periodEntries = trialBalanceEntries.filter(entry => entry.period_id === periodId);
    
    // Group entries by category based on ledger names
    const assets: BalanceSheetData[] = [];
    const liabilities: BalanceSheetData[] = [];
    const equity: BalanceSheetData[] = [];

    periodEntries.forEach(entry => {
      const amount = (entry.debit || 0) - (entry.credit || 0);
      const ledgerName = entry.ledger_name.toLowerCase();

      if (ledgerName.includes('asset') || ledgerName.includes('cash') || ledgerName.includes('inventory')) {
        assets.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'ASSETS'
        });
      } else if (ledgerName.includes('liability') || ledgerName.includes('payable') || ledgerName.includes('loan')) {
        liabilities.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'LIABILITIES'
        });
      } else if (ledgerName.includes('capital') || ledgerName.includes('equity') || ledgerName.includes('reserve')) {
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
    if (!periodId || trialBalanceEntries.length === 0) return [];

    const periodEntries = trialBalanceEntries.filter(entry => entry.period_id === periodId);
    
    const revenue: PLData[] = [];
    const expenses: PLData[] = [];

    periodEntries.forEach(entry => {
      const amount = (entry.credit || 0) - (entry.debit || 0);
      const ledgerName = entry.ledger_name.toLowerCase();

      if (ledgerName.includes('sales') || ledgerName.includes('revenue') || ledgerName.includes('income')) {
        revenue.push({
          account: entry.ledger_name,
          current_amount: Math.abs(amount),
          category: 'REVENUE'
        });
      } else if (ledgerName.includes('expense') || ledgerName.includes('cost') || ledgerName.includes('wages')) {
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
    const balanceSheetData = getBalanceSheetData(periodId);
    return balanceSheetData
      .filter(item => item.category === 'ASSETS')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalLiabilities = (periodId?: number): number => {
    const balanceSheetData = getBalanceSheetData(periodId);
    return balanceSheetData
      .filter(item => item.category === 'LIABILITIES')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalEquity = (periodId?: number): number => {
    const balanceSheetData = getBalanceSheetData(periodId);
    return balanceSheetData
      .filter(item => item.category === 'EQUITY')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalRevenue = (periodId?: number): number => {
    const plData = getPLData(periodId);
    return plData
      .filter(item => item.category === 'REVENUE')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  const getTotalExpenses = (periodId?: number): number => {
    const plData = getPLData(periodId);
    return plData
      .filter(item => item.category === 'EXPENSES')
      .reduce((sum, item) => sum + item.current_amount, 0);
  };

  return {
    periods,
    trialBalanceEntries,
    loading,
    hasData,
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