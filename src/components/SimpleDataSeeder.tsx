import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sampleSchedule3Items } from "@/utils/sampleData";

export const SimpleDataSeeder = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const seedBasicStructure = async () => {
    try {
      setLoading(true);
      
      // Only seed the Schedule 3 master items - the core structure
      const { data, error } = await supabase
        .from('schedule3_master_items')
        .upsert(sampleSchedule3Items, {
          onConflict: 'schedule3_item,report_type,report_section',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Seeded ${data.length} Schedule 3 master items. You can now map your Tally accounts to these items.`,
      });
    } catch (error) {
      console.error('Error seeding basic structure:', error);
      toast({
        title: "Error",
        description: "Failed to seed basic structure: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Setup Schedule 3 Structure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>This will create the basic Schedule 3 structure for financial reporting.</p>
          <p><strong>Next steps after seeding:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Upload your trial balance data using the Upload page</li>
            <li>Use the mapper below to map your Tally accounts to Schedule 3 items</li>
            <li>View your generated financial reports on the Reports page</li>
          </ol>
        </div>
        
        <Button 
          onClick={seedBasicStructure}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Setting up...' : 'Setup Schedule 3 Structure'}
        </Button>
      </CardContent>
    </Card>
  );
};