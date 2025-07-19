
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataSeeder } from "@/components/DataSeeder";
import { BarChart3, Upload, Map, Users, TrendingUp, Database } from "lucide-react";

interface DashboardStats {
  totalPeriods: number;
  totalMappings: number;
  totalAccounts: number;
  unmappedAccounts: number;
  lastUploadDate: string | null;
  completionPercentage: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPeriods: 0,
    totalMappings: 0, 
    totalAccounts: 0,
    unmappedAccounts: 0,
    lastUploadDate: null,
    completionPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get financial periods count
      const { count: periodsCount } = await supabase
        .from('financial_periods')
        .select('*', { count: 'exact', head: true });

      // Get mappings count
      const { count: mappingsCount } = await supabase
        .from('schedule3_mapping')
        .select('*', { count: 'exact', head: true });

      // Get unique accounts count
      const { data: accountsData } = await supabase
        .from('trial_balance_entries')
        .select('ledger_name')
        .group('ledger_name');

      // Get unmapped accounts
      const { data: unmappedData } = await supabase
        .from('trial_balance_entries')
        .select('ledger_name')
        .not('ledger_name', 'in', 
          supabase
            .from('schedule3_mapping')
            .select('tally_ledger_name')
        );

      // Get last upload date
      const { data: lastUpload } = await supabase
        .from('financial_periods')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const totalAccounts = accountsData?.length || 0;
      const unmappedAccounts = unmappedData?.length || 0;
      const completionPercentage = totalAccounts > 0 
        ? Math.round(((totalAccounts - unmappedAccounts) / totalAccounts) * 100)
        : 0;

      setStats({
        totalPeriods: periodsCount || 0,
        totalMappings: mappingsCount || 0,
        totalAccounts,
        unmappedAccounts,
        lastUploadDate: lastUpload?.created_at || null,
        completionPercentage
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: string | number;
    icon: any;
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">DKEGL Financial Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your financial reporting workflow and account mapping progress
        </p>
      </div>

      <DataSeeder />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Financial Periods"
          value={stats.totalPeriods}
          icon={Database}
          description="Uploaded quarters"
        />
        
        <StatCard
          title="Account Mappings"
          value={stats.totalMappings}
          icon={Map}
          description="Mapped to Schedule 3"
        />
        
        <StatCard
          title="Total Accounts"
          value={stats.totalAccounts}
          icon={BarChart3}
          description="From trial balance"
        />
        
        <StatCard
          title="Completion Rate"
          value={`${stats.completionPercentage}%`}
          icon={TrendingUp}
          description="Accounts mapped"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mapping Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mapped Accounts</span>
                <span>{stats.totalAccounts - stats.unmappedAccounts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Unmapped Accounts</span>
                <span className="text-orange-600">{stats.unmappedAccounts}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <span>Last Upload: </span>
                  <span className="font-medium">
                    {stats.lastUploadDate 
                      ? new Date(stats.lastUploadDate).toLocaleDateString()
                      : 'No uploads yet'
                    }
                  </span>
                </div>
              </div>
              
              {stats.unmappedAccounts > 0 && (
                <div className="flex items-center space-x-2">
                  <Map className="h-4 w-4 text-orange-600" />
                  <div className="text-sm">
                    <span className="text-orange-600">
                      {stats.unmappedAccounts} accounts need mapping
                    </span>
                  </div>
                </div>
              )}
              
              {stats.completionPercentage === 100 && (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div className="text-sm text-green-600 font-medium">
                    All accounts mapped! Ready for reporting.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.totalAccounts === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>To begin using the financial reporting system:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Use the "Seed Schedule 3 Items" button above to populate the master chart</li>
                <li>Use the "Seed Sample Trial Balance" to create test data, OR</li>
                <li>Go to the <strong>Upload Data</strong> page to upload your CSV trial balance file</li>
                <li>Use the <strong>Chart of Accounts Mapper</strong> to link your accounts to Schedule 3 items</li>
                <li>Return here to view your financial reporting progress</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
