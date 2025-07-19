
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
          quarter_end_date: quarterEndDate.toISOString().split('T')[0],
          notes: `Q${Math.ceil((quarterEndDate.getMonth() + 1) / 3)} ${quarterEndDate.getFullYear()} - Test Period`,
          status: 'active',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Create sample trial balance entries using the correct schema
      const sampleEntries = [
        { ledger_name: 'Cash in Hand', debit: 50000, credit: 0, period_id: periodData.id },
        { ledger_name: 'Bank Account', debit: 200000, credit: 0, period_id: periodData.id },
        { ledger_name: 'Accounts Payable', debit: 0, credit: 75000, period_id: periodData.id },
        { ledger_name: 'Share Capital', debit: 0, credit: 100000, period_id: periodData.id },
        { ledger_name: 'Sales Revenue', debit: 0, credit: 300000, period_id: periodData.id },
        { ledger_name: 'Office Expenses', debit: 25000, credit: 0, period_id: periodData.id },
      ];

      const { error: entriesError } = await supabase
        .from('trial_balance_entries')
        .insert(sampleEntries);

      if (entriesError) throw entriesError;

      // Get master items using the correct column name
      const { data: masterItems, error: masterError } = await supabase
        .from('schedule3_master_items')
        .select('id, schedule3_item, report_type')
        .limit(6);

      if (masterError) throw masterError;

      // Create sample mappings using master_item_id
      if (masterItems && masterItems.length > 0) {
        const sampleMappings = sampleEntries.map((entry, index) => ({
          tally_ledger_name: entry.ledger_name,
          master_item_id: masterItems[index % masterItems.length].id
        }));

        const { error: mappingError } = await supabase
          .from('schedule3_mapping')
          .insert(sampleMappings);

        if (mappingError) throw mappingError;

        // Create final reports using the correct schema
        const finalReports = masterItems.slice(0, 3).map((item, index) => ({
          period_id: periodData.id,
          master_item_id: item.id,
          amount: [250000, 75000, 100000][index]
        }));

        const { error: reportsError } = await supabase
          .from('final_reports')
          .insert(finalReports);

        if (reportsError) throw reportsError;
      }

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
