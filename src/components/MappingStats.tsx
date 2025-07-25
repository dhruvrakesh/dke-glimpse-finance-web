
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface MappingStatsData {
  totalAccounts: number;
  mappedAccounts: number;
  completionPercentage: number;
}

export const MappingStats = () => {
  const [stats, setStats] = useState<MappingStatsData>({
    totalAccounts: 0,
    mappedAccounts: 0,
    completionPercentage: 0
  });

  useEffect(() => {
    fetchMappingStats();
  }, []);

  const fetchMappingStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_mapping_statistics');

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        setStats({
          totalAccounts: result.total_accounts || 0,
          mappedAccounts: result.mapped_accounts || 0,
          completionPercentage: result.completion_percentage || 0
        });
      }
    } catch (error) {
      console.error('Error fetching mapping stats:', error);
    }
  };

  // Refresh stats when called from parent
  const refreshStats = () => {
    fetchMappingStats();
  };

  return { stats, refreshStats };
};

interface MappingStatsCardProps {
  onRefresh?: (refreshFn: () => void) => void;
}

export const MappingStatsCard = ({ onRefresh }: MappingStatsCardProps) => {
  const { stats, refreshStats } = MappingStats();

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefresh) {
      onRefresh(refreshStats);
    }
  }, [onRefresh, refreshStats]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Mapping Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Mapped Accounts</span>
            <span>{stats.mappedAccounts} of {stats.totalAccounts}</span>
          </div>
          <Progress value={stats.completionPercentage} className="w-full" />
          <div className="text-center text-sm text-muted-foreground">
            {stats.completionPercentage}% Complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
