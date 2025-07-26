import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sampleSchedule3Items } from "@/utils/sampleData";
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
        description: `Seeded ${data.length} Schedule 3 master items`,
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
        description: "All data cleared successfully",
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
            onClick={() => setShowClearDialog(true)}
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Quick Start:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Click "Seed Schedule 3 Items" to set up the master chart of accounts</li>
            <li>Go to Upload page to import your trial balance data</li>
            <li>Use the Mapper page to create account mappings</li>
            <li>View your reports on the Dashboard</li>
          </ol>
          <p className="text-amber-600 font-medium">
            Note: This seeder now focuses on core functionality. Upload your trial balance data via the Upload page instead of using hardcoded sample data.
          </p>
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