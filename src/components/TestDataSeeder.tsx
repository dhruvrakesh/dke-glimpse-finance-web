
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TestDataSeeder: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const seedTestData = async () => {
    setIsSeeding(true);
    try {
      // Create a test financial period
      const quarterEndDate = new Date();
      quarterEndDate.setMonth(quarterEndDate.getMonth() - 1); // Last month

      const { data: periodData, error: periodError } = await supabase
        .from('financial_periods')
        .insert({
          period_name: `Q${Math.ceil((quarterEndDate.getMonth() + 1) / 3)} ${quarterEndDate.getFullYear()}`,
          quarter_end_date: quarterEndDate.toISOString().split('T')[0],
          fiscal_year: quarterEndDate.getFullYear().toString()
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Create sample trial balance entries
      const sampleEntries = [
        { account_code: '1001', account_name: 'Cash in Hand', debit_amount: 50000, credit_amount: 0, balance_amount: 50000 },
        { account_code: '1002', account_name: 'Bank Account', debit_amount: 200000, credit_amount: 0, balance_amount: 200000 },
        { account_code: '2001', account_name: 'Accounts Payable', debit_amount: 0, credit_amount: 75000, balance_amount: -75000 },
        { account_code: '3001', account_name: 'Share Capital', debit_amount: 0, credit_amount: 100000, balance_amount: -100000 },
        { account_code: '4001', account_name: 'Sales Revenue', debit_amount: 0, credit_amount: 300000, balance_amount: -300000 },
        { account_code: '5001', account_name: 'Office Expenses', debit_amount: 25000, credit_amount: 0, balance_amount: 25000 },
      ];

      const { error: entriesError } = await supabase
        .from('trial_balance_entries')
        .insert(
          sampleEntries.map(entry => ({
            ...entry,
            financial_period_id: periodData.id,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          }))
        );

      if (entriesError) throw entriesError;

      // Create sample mappings
      const sampleMappings = [
        { tally_ledger_name: 'Cash in Hand', schedule3_item: 'Cash and Cash Equivalents', report_type: 'BalanceSheet', report_section: 'Current Assets', is_credit_positive: false },
        { tally_ledger_name: 'Bank Account', schedule3_item: 'Cash and Cash Equivalents', report_type: 'BalanceSheet', report_section: 'Current Assets', is_credit_positive: false },
        { tally_ledger_name: 'Accounts Payable', schedule3_item: 'Trade Payables', report_type: 'BalanceSheet', report_section: 'Current Liabilities', is_credit_positive: true },
        { tally_ledger_name: 'Share Capital', schedule3_item: 'Equity Share Capital', report_type: 'BalanceSheet', report_section: 'Equity', is_credit_positive: true },
        { tally_ledger_name: 'Sales Revenue', schedule3_item: 'Revenue from Operations', report_type: 'ProfitAndLoss', report_section: 'Revenue', is_credit_positive: true },
        { tally_ledger_name: 'Office Expenses', schedule3_item: 'Other Expenses', report_type: 'ProfitAndLoss', report_section: 'Expenses', is_credit_positive: false },
      ];

      const { error: mappingError } = await supabase
        .from('schedule3_mapping')
        .insert(sampleMappings);

      if (mappingError) throw mappingError;

      // Create final reports
      const balanceSheetReports = [
        { schedule3_item: 'Cash and Cash Equivalents', report_section: 'Current Assets', report_sub_section: 'Financial Assets', report_type: 'BalanceSheet', amount: 250000, is_credit_positive: false },
        { schedule3_item: 'Trade Payables', report_section: 'Current Liabilities', report_sub_section: 'Financial Liabilities', report_type: 'BalanceSheet', amount: 75000, is_credit_positive: true },
        { schedule3_item: 'Equity Share Capital', report_section: 'Equity', report_sub_section: null, report_type: 'BalanceSheet', amount: 100000, is_credit_positive: true },
      ];

      const profitLossReports = [
        { schedule3_item: 'Revenue from Operations', report_section: 'Revenue', report_sub_section: null, report_type: 'ProfitAndLoss', amount: 300000, is_credit_positive: true },
        { schedule3_item: 'Other Expenses', report_section: 'Expenses', report_sub_section: null, report_type: 'ProfitAndLoss', amount: 25000, is_credit_positive: false },
      ];

      const { error: reportsError } = await supabase
        .from('final_reports')
        .insert([
          ...balanceSheetReports.map(report => ({ ...report, financial_period_id: periodData.id })),
          ...profitLossReports.map(report => ({ ...report, financial_period_id: periodData.id }))
        ]);

      if (reportsError) throw reportsError;

      toast({
        title: "Success!",
        description: "Test data has been seeded successfully. Refresh the dashboard to see the reports.",
      });

    } catch (error) {
      console.error('Error seeding test data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to seed test data",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Test Data Seeder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button below to seed sample financial data for testing the dashboard reports.
        </p>
        <Button 
          onClick={seedTestData} 
          disabled={isSeeding}
          variant="outline"
        >
          {isSeeding ? 'Seeding Data...' : 'Seed Test Data'}
        </Button>
      </CardContent>
    </Card>
  );
};
