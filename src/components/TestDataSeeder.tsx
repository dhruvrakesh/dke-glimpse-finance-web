import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sampleTrialBalanceData } from "@/utils/sampleData";

export const TestDataSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const seedTestData = async () => {
    try {
      setIsSeeding(true);
      
      // Create a test financial period
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
      const quarterEndDate = new Date(currentYear, currentQuarter * 3 - 1, 0);
      const periodName = `Q${currentQuarter} ${currentYear}`;
      
      const { data: periodData, error: periodError } = await supabase
        .from('financial_periods')
        .upsert({
          quarter_end_date: quarterEndDate.toISOString().split('T')[0],
          year: currentYear,
          quarter: currentQuarter,
          period_name: periodName,
          status: 'active'
        }, {
          onConflict: 'year,quarter',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Clear existing trial balance entries for this period
      await supabase
        .from('trial_balance_entries')
        .delete()
        .eq('period_id', periodData.id);

      // Seed trial balance entries
      const trialBalanceEntries = sampleTrialBalanceData.map(item => ({
        period_id: periodData.id,
        ledger_name: item.ledger_name,
        opening_balance: 0,
        debit_amount: item.closing_balance > 0 ? item.closing_balance : 0,
        credit_amount: item.closing_balance < 0 ? Math.abs(item.closing_balance) : 0,
        closing_balance: item.closing_balance
      }));

      const { data: tbData, error: tbError } = await supabase
        .from('trial_balance_entries')
        .insert(trialBalanceEntries)
        .select();

      if (tbError) throw tbError;

      // Seed sample mappings
      const { data: masterItems } = await supabase
        .from('schedule3_master_items')
        .select('*');

      if (masterItems && masterItems.length > 0) {
        const schedule3Lookup = new Map();
        masterItems.forEach(item => {
          schedule3Lookup.set(item.schedule3_item, item.id);
        });

        const sampleMappingDefinitions = [
          { tally_ledger_name: 'Building', schedule3_item: 'Property, Plant and Equipment' },
          { tally_ledger_name: 'Plant & Machinery', schedule3_item: 'Property, Plant and Equipment' },
          { tally_ledger_name: 'Sundry Debtors', schedule3_item: 'Trade Receivables' },
          { tally_ledger_name: 'Cash in Hand', schedule3_item: 'Cash and Cash Equivalents' },
          { tally_ledger_name: 'Bank Current Account - SBI', schedule3_item: 'Cash and Cash Equivalents' },
          { tally_ledger_name: 'Raw Materials', schedule3_item: 'Inventories' },
          { tally_ledger_name: 'Finished Goods', schedule3_item: 'Inventories' },
          { tally_ledger_name: 'Share Capital', schedule3_item: 'Equity Share Capital' },
          { tally_ledger_name: 'Sundry Creditors', schedule3_item: 'Trade Payables' },
          { tally_ledger_name: 'Sales - Domestic', schedule3_item: 'Revenue from Operations' }
        ];

        const existingLedgers = new Set(tbData.map(entry => entry.ledger_name));
        const validMappingDefinitions = sampleMappingDefinitions.filter(mapping => 
          existingLedgers.has(mapping.tally_ledger_name) && 
          schedule3Lookup.has(mapping.schedule3_item)
        );

        if (validMappingDefinitions.length > 0) {
          const validMappings = validMappingDefinitions.map(mapping => ({
            tally_ledger_name: mapping.tally_ledger_name,
            master_item_id: schedule3Lookup.get(mapping.schedule3_item),
            period_id: periodData.id
          }));

          await supabase
            .from('schedule3_mapping')
            .upsert(validMappings, {
              onConflict: 'tally_ledger_name,period_id',
              ignoreDuplicates: false
            });
        }
      }

      toast({
        title: "Success",
        description: `Seeded test data: ${tbData.length} trial balance entries and sample mappings`,
      });
    } catch (error) {
      console.error('Error seeding test data:', error);
      toast({
        title: "Error",
        description: "Failed to seed test data: " + (error as Error).message,
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
          This will create sample trial balance data and basic mappings for testing the enterprise reporting functionality.
        </p>
        <Button 
          onClick={seedTestData}
          disabled={isSeeding}
          variant="outline"
        >
          {isSeeding ? 'Seeding Test Data...' : 'Seed Test Data'}
        </Button>
      </CardContent>
    </Card>
  );
};