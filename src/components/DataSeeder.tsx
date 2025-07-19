
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sampleSchedule3Items, sampleTrialBalanceData } from "@/utils/sampleData";

export const DataSeeder = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const seedSchedule3Items = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('schedule3_master_items')
        .insert(sampleSchedule3Items)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Seeded ${data.length} Schedule 3 master items`,
      });
    } catch (error) {
      console.error('Error seeding Schedule 3 items:', error);
      toast({
        title: "Error",
        description: "Failed to seed Schedule 3 items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const seedTrialBalanceData = async () => {
    try {
      setLoading(true);
      
      // First create a financial period
      const currentDate = new Date();
      const quarterEndDate = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3 + 2, 0);
      
      const { data: periodData, error: periodError } = await supabase
        .from('financial_periods')
        .insert({
          quarter_end_date: quarterEndDate.toISOString().split('T')[0],
          year: quarterEndDate.getFullYear(),
          quarter: Math.floor(quarterEndDate.getMonth() / 3) + 1,
          period_name: `Q${Math.floor(quarterEndDate.getMonth() / 3) + 1} ${quarterEndDate.getFullYear()}`
        })
        .select()
        .single();

      if (periodError) throw periodError;

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
        description: `Seeded financial period and ${tbData.length} trial balance entries`,
      });
    } catch (error) {
      console.error('Error seeding trial balance data:', error);
      toast({
        title: "Error",
        description: "Failed to seed trial balance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      
      // Clear in order due to foreign key constraints
      await supabase.from('schedule3_mapping').delete().gt('id', 0);
      await supabase.from('trial_balance_entries').delete().gt('id', 0);
      await supabase.from('financial_periods').delete().gt('id', 0);
      await supabase.from('schedule3_master_items').delete().gt('id', 0);

      toast({
        title: "Success",
        description: "All sample data cleared",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error", 
        description: "Failed to clear data",
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
            onClick={clearAllData}
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Use these tools to populate sample data for testing the application workflow.
        </p>
      </CardContent>
    </Card>
  );
};
