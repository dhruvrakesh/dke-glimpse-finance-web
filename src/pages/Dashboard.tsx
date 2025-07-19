import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Upload, TrendingUp, Users } from "lucide-react";

interface UploadStat {
  total_uploads: number;
  recent_uploads: number;
}

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [uploadStats, setUploadStats] = useState<UploadStat>({ total_uploads: 0, recent_uploads: 0 });
  const [recentPeriods, setRecentPeriods] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentPeriods();
  }, []);

  const fetchStats = async () => {
    // Get upload statistics (assuming trial_balance_entries exists, fallback to empty if not)
    const { data: uploads } = await supabase
      .from('trial_balance_entries')
      .select('id, created_at')
      .limit(1);
    
    // For now, set static values since table may not have data yet
    setUploadStats({
      total_uploads: uploads?.length || 0,
      recent_uploads: 0
    });
  };

  const fetchRecentPeriods = async () => {
    const { data } = await supabase
      .from('financial_periods')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    setRecentPeriods(data || []);
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
            <p className="text-xs text-muted-foreground">Active periods</p>
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
                {recentPeriods.slice(0, 3).map((period: any) => (
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
                No financial periods found. Create one to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};