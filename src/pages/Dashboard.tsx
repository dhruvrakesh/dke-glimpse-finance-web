import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Upload, TrendingUp, Users, Calendar } from "lucide-react";
import { BalanceSheetDisplay } from "@/components/BalanceSheetDisplay";
import { ProfitAndLossDisplay } from "@/components/ProfitAndLossDisplay";
import { TestDataSeeder } from "@/components/TestDataSeeder";
import { useToast } from "@/hooks/use-toast";

interface UploadStat {
  total_uploads: number;
  recent_uploads: number;
}

interface FinancialPeriod {
  id: string;
  period_name: string;
  quarter_end_date: string;
}

interface FinancialReportData {
  schedule3_item: string;
  report_section: string;
  report_sub_section: string;
  report_type: string;
  amount: number;
  is_credit_positive: boolean;
}

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [uploadStats, setUploadStats] = useState<UploadStat>({ total_uploads: 0, recent_uploads: 0 });
  const [recentPeriods, setRecentPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [balanceSheetData, setBalanceSheetData] = useState<FinancialReportData[]>([]);
  const [profitLossData, setProfitLossData] = useState<FinancialReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchReportData(selectedPeriod);
    }
  }, [selectedPeriod]);

  const fetchStats = async () => {
    try {
      const { data: uploads, error } = await supabase
        .from('trial_balance_entries')
        .select('id, created_at');
      
      if (error) throw error;

      const total = uploads?.length || 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recent = uploads?.filter(upload => 
        new Date(upload.created_at) > oneWeekAgo
      ).length || 0;

      setUploadStats({
        total_uploads: total,
        recent_uploads: recent
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_periods')
        .select('*')
        .order('quarter_end_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setRecentPeriods(data || []);
      
      // Auto-select the most recent period
      if (data && data.length > 0) {
        setSelectedPeriod(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financial periods",
        variant: "destructive",
      });
    }
  };

  const fetchReportData = async (periodId: string) => {
    setIsLoading(true);
    try {
      // Fetch final reports data for the selected period
      const { data: reportData, error } = await supabase
        .from('final_reports')
        .select(`
          schedule3_item,
          report_section,
          report_sub_section,
          report_type,
          amount,
          is_credit_positive
        `)
        .eq('financial_period_id', periodId);

      if (error) throw error;

      if (reportData && reportData.length > 0) {
        const balanceSheet = reportData.filter(item => item.report_type === 'BalanceSheet');
        const profitLoss = reportData.filter(item => item.report_type === 'ProfitAndLoss');
        
        setBalanceSheetData(balanceSheet);
        setProfitLossData(profitLoss);
      } else {
        setBalanceSheetData([]);
        setProfitLossData([]);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to the DKEGL Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Financial Reporting & Analytics Platform
          </p>
        </div>
        {isAdmin && <Badge variant="secondary">Administrator</Badge>}
      </div>

      {/* Add Test Data Seeder for admin users only */}
      {isAdmin && <TestDataSeeder />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats.total_uploads}</div>
            <p className="text-xs text-muted-foreground">Trial balance entries</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats.recent_uploads}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Periods</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPeriods.length}</div>
            <p className="text-xs text-muted-foreground">Available periods</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Access</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">All</div>
              <p className="text-xs text-muted-foreground">Full system access</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Financial Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <label htmlFor="period-select" className="text-sm font-medium">
              Select Period:
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a financial period" />
              </SelectTrigger>
              <SelectContent>
                {recentPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.period_name} ({new Date(period.quarter_end_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading financial reports...</div>
            </div>
          )}
          
          {!isLoading && selectedPeriod && (
            <div className="space-y-8">
              <BalanceSheetDisplay data={balanceSheetData} />
              <ProfitAndLossDisplay data={profitLossData} />
            </div>
          )}
          
          {!isLoading && !selectedPeriod && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                Select a financial period to view reports
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Status:</span> Active
              </p>
              {isAdmin && (
                <p className="text-sm">
                  <span className="font-medium">Role:</span> Administrator
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Financial Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPeriods.length > 0 ? (
              <div className="space-y-2">
                {recentPeriods.slice(0, 3).map((period) => (
                  <div key={period.id} className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">{period.period_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {new Date(period.quarter_end_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No financial periods found. Upload data to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
