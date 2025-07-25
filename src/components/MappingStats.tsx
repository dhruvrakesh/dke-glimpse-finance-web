
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
      // Get unique accounts from trial balance
      const { data: accountsData } = await supabase
        .from('trial_balance_entries')
        .select('ledger_name');

      // Get mapped accounts
      const { data: mappingsData } = await supabase
        .from('schedule3_mapping')
        .select('tally_ledger_name');

      if (!accountsData) {
        setStats({ totalAccounts: 0, mappedAccounts: 0, completionPercentage: 0 });
        return;
      }

      // Create set of unique accounts and mapped accounts
      const uniqueAccounts = [...new Set(accountsData.map(a => a.ledger_name))];
      const mappedAccountsSet = new Set(mappingsData?.map(m => m.tally_ledger_name) || []);
      
      // Count how many unique accounts are actually mapped
      const mappedCount = uniqueAccounts.filter(account => mappedAccountsSet.has(account)).length;
      const totalAccounts = uniqueAccounts.length;
      
      const completionPercentage = totalAccounts > 0 
        ? Math.round((mappedCount / totalAccounts) * 100)
        : 0;

      setStats({
        totalAccounts,
        mappedAccounts: mappedCount,
        completionPercentage
      });
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
