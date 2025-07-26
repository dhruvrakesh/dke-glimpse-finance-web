
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sampleSchedule3Items, sampleTrialBalanceData } from "@/utils/sampleData";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export const DataSeeder = () => {
  const [loading, setLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { toast } = useToast();

  const seedSchedule3Items = async () => {
    try {
      setLoading(true);
      
      // First delete existing items to avoid conflicts
      await supabase.from('schedule3_master_items').delete().gt('id', 0);
      
      // Insert fresh data
      const { data, error } = await supabase
        .from('schedule3_master_items')
        .insert(sampleSchedule3Items)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Seeded/Updated ${data.length} Schedule 3 master items`,
      });
    } catch (error) {
      console.error('Error seeding Schedule 3 items:', error);
      toast({
        title: "Error",
        description: "Failed to seed Schedule 3 items: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const seedTrialBalanceData = async () => {
    try {
      setLoading(true);
      
      // First create or get existing financial period
      const currentDate = new Date();
      const quarterEndDate = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3 + 2, 0);
      const periodName = `Q${Math.floor(quarterEndDate.getMonth() / 3) + 1} ${quarterEndDate.getFullYear()}`;
      
      const { data: periodData, error: periodError } = await supabase
        .from('financial_periods')
        .upsert({
          quarter_end_date: quarterEndDate.toISOString().split('T')[0],
          year: quarterEndDate.getFullYear(),
          quarter: Math.floor(quarterEndDate.getMonth() / 3) + 1,
          period_name: periodName
        }, {
          onConflict: 'period_name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Clear existing trial balance entries for this period to avoid duplicates
      await supabase
        .from('trial_balance_entries')
        .delete()
        .eq('period_id', periodData.id);

      // Then seed trial balance entries
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

      toast({
        title: "Success", 
        description: `Seeded financial period "${periodName}" and ${tbData.length} trial balance entries`,
      });
    } catch (error) {
      console.error('Error seeding trial balance data:', error);
      toast({
        title: "Error",
        description: "Failed to seed trial balance data: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const seedSampleMappings = async () => {
    try {
      setLoading(true);
      
      // Get the latest financial period
      const { data: period } = await supabase
        .from('financial_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!period) {
        throw new Error('No financial period found. Please seed trial balance data first.');
      }

      // Get some trial balance entries to map
      const { data: trialEntries } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .eq('period_id', period.id)
        .limit(10);

      if (!trialEntries || trialEntries.length === 0) {
        throw new Error('No trial balance entries found. Please seed trial balance data first.');
      }

      // Get all schedule3 master items for lookup
      const { data: masterItems, error: masterError } = await supabase
        .from('schedule3_master_items')
        .select('*');

      if (masterError) throw masterError;

      // Create lookup map for schedule3 items
      const schedule3Lookup = new Map();
      masterItems?.forEach(item => {
        schedule3Lookup.set(item.schedule3_item, item.id);
      });

      // Create sample mapping definitions
      const sampleMappingDefinitions = [
        {
          tally_ledger_name: 'Building',
          schedule3_item: 'Property, Plant and Equipment'
        },
        {
          tally_ledger_name: 'Plant & Machinery',
          schedule3_item: 'Property, Plant and Equipment'
        },
        {
          tally_ledger_name: 'Sundry Debtors',
          schedule3_item: 'Trade Receivables'
        },
        {
          tally_ledger_name: 'Cash in Hand',
          schedule3_item: 'Cash and Cash Equivalents'
        },
        {
          tally_ledger_name: 'Bank Current Account',
          schedule3_item: 'Cash and Cash Equivalents'
        },
        {
          tally_ledger_name: 'Raw Materials',
          schedule3_item: 'Inventories'
        },
        {
          tally_ledger_name: 'Finished Goods',
          schedule3_item: 'Inventories'
        },
        {
          tally_ledger_name: 'Share Capital',
          schedule3_item: 'Equity Share Capital'
        },
        {
          tally_ledger_name: 'Sundry Creditors',
          schedule3_item: 'Trade Payables'
        },
        {
          tally_ledger_name: 'Sales',
          schedule3_item: 'Revenue from Operations'
        }
      ];

      // Filter mappings to only include ledgers that exist in trial balance and schedule3
      const existingLedgers = new Set(trialEntries.map(entry => entry.ledger_name));
      const validMappingDefinitions = sampleMappingDefinitions.filter(mapping => 
        existingLedgers.has(mapping.tally_ledger_name) && 
        schedule3Lookup.has(mapping.schedule3_item)
      );

      if (validMappingDefinitions.length === 0) {
        throw new Error('No matching ledgers found for mapping.');
      }

      // Convert to proper database format with master_item_id
      const validMappings = validMappingDefinitions.map(mapping => ({
        tally_ledger_name: mapping.tally_ledger_name,
        master_item_id: schedule3Lookup.get(mapping.schedule3_item),
        period_id: period.id
      }));

      const { data: mappingData, error: mappingError } = await supabase
        .from('schedule3_mapping')
        .upsert(validMappings, {
          onConflict: 'tally_ledger_name,period_id',
          ignoreDuplicates: false
        })
        .select();

      if (mappingError) throw mappingError;

      toast({
        title: "Success",
        description: `Created ${mappingData.length} sample account mappings`,
      });
    } catch (error) {
      console.error('Error seeding sample mappings:', error);
      toast({
        title: "Error",
        description: "Failed to seed sample mappings: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      
      // Clear in proper order to handle foreign key constraints
      // First clear calculated ratios (dependent on periods)
      const { error: ratiosError } = await supabase.from('calculated_ratios').delete().gt('id', 0);
      if (ratiosError) throw ratiosError;
      
      // Clear user benchmarks
      const { error: benchmarksError } = await supabase.from('user_ratio_benchmarks').delete().gt('id', 0);
      if (benchmarksError) throw benchmarksError;
      
      // Clear mappings (dependent on periods and master items)
      const { error: mappingError } = await supabase.from('schedule3_mapping').delete().gt('id', 0);
      if (mappingError) throw mappingError;
      
      // Clear trial balance entries (dependent on periods)
      const { error: tbError } = await supabase.from('trial_balance_entries').delete().gt('id', 0);
      if (tbError) throw tbError;
      
      // Clear financial periods
      const { error: periodError } = await supabase.from('financial_periods').delete().gt('id', 0);
      if (periodError) throw periodError;
      
      // Finally clear master items
      const { error: masterError } = await supabase.from('schedule3_master_items').delete().gt('id', 0);
      if (masterError) throw masterError;

      toast({
        title: "Success",
        description: "All data cleared successfully including calculated ratios",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error", 
        description: "Failed to clear data: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Data Management Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={seedSchedule3Items}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Seeding...' : 'Seed Schedule 3 Items'}
          </Button>
          
          <Button 
            onClick={seedTrialBalanceData}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Seeding...' : 'Seed Sample Trial Balance'}
          </Button>

          <Button 
            onClick={seedSampleMappings}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Creating...' : 'Create Sample Mappings'}
          </Button>
          
          <Button 
            onClick={() => setShowClearDialog(true)}
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Complete Workflow:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Click "Seed Schedule 3 Items" to populate the master chart of accounts</li>
            <li>Click "Seed Sample Trial Balance" to create a financial period with sample data</li>
            <li>Click "Create Sample Mappings" to map some accounts automatically</li>
            <li>Use the Chart of Accounts Mapper to complete remaining mappings</li>
            <li>View your progress on the Dashboard</li>
          </ol>
        </div>
      </CardContent>
      
      <ConfirmationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Clear All Data"
        description="This will permanently delete all financial periods, trial balance entries, account mappings, and Schedule 3 master items. This action cannot be undone."
        confirmText="Clear All Data"
        variant="destructive"
        onConfirm={clearAllData}
      />
    </Card>
  );
};
