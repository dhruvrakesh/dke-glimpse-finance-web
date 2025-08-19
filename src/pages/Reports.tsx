import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, BarChart3, PieChart, FileText, Settings, AlertTriangle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { EnhancedBalanceSheet } from "@/components/reports/EnhancedBalanceSheet";
import { EnhancedProfitAndLoss } from "@/components/reports/EnhancedProfitAndLoss";
import { RatioAnalysisDashboard } from "@/components/reports/RatioAnalysisDashboard";
import { CashFlowStatement } from "@/components/reports/CashFlowStatement";
import { DataFreshnessIndicator } from "@/components/reports/DataFreshnessIndicator";
import { ReportSettings } from "@/components/reports/ReportSettings";
import { ExportAllReports } from "@/components/reports/ExportAllReports";
import { DataQualityIndicator } from "@/components/reports/DataQualityIndicator";
import { StockReconciliationView } from "@/components/reports/StockReconciliationView";
import { SimpleRatioAnalysis } from "@/components/reports/SimpleRatioAnalysis";
import { BenchmarkSettings } from "@/components/reports/BenchmarkSettings";
import { EnhancedPeriodSelector } from "@/components/reports/EnhancedPeriodSelector";
import { AccountMappingInterface } from "@/components/reports/AccountMappingInterface";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [periodReadiness, setPeriodReadiness] = useState<any>(null);
  
  const {
    periods,
    trialBalanceEntries,
    loading,
    hasData,
    selectedPeriodId,
    setSelectedPeriodId,
    getCurrentPeriod,
    getBalanceSheetData,
    getPLData,
    getTotalAssets,
    getTotalLiabilities,
    getTotalEquity,
    getTotalRevenue,
    getTotalExpenses,
    refetch
  } = useFinancialData();

  // Check period readiness whenever period changes
  useEffect(() => {
    if (selectedPeriodId) {
      checkPeriodReadiness();
    }
  }, [selectedPeriodId]);

  const checkPeriodReadiness = async () => {
    if (!selectedPeriodId) return;
    
    try {
      const { data, error } = await supabase.rpc(
        'validate_period_readiness',
        { period_id_param: selectedPeriodId }
      );
      
      if (error) throw error;
      setPeriodReadiness(data);
    } catch (error) {
      console.error('Error checking period readiness:', error);
    }
  };

  const reportMetrics = useMemo(() => {
    if (!hasData() || !selectedPeriodId) {
      return [
        { title: "Total Assets", value: "₹0", change: "0%", icon: TrendingUp },
        { title: "Net Profit Margin", value: "0%", change: "0%", icon: BarChart3 },
        { title: "Current Ratio", value: "0.00", change: "0%", icon: PieChart },
        { title: "Trial Balance Entries", value: "0", change: "0%", icon: FileText }
      ];
    }

    const totalAssets = getTotalAssets();
    const totalRevenue = getTotalRevenue();
    const totalExpenses = getTotalExpenses();
    const netProfit = totalRevenue - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const currentPeriodEntries = trialBalanceEntries.filter(entry => entry.period_id === selectedPeriodId);
    const currentAssets = getBalanceSheetData().filter(item => 
      item.category === 'ASSETS' && item.account.toLowerCase().includes('current')
    ).reduce((sum, item) => sum + item.current_amount, 0);
    
    const currentLiabilities = getBalanceSheetData().filter(item => 
      item.category === 'LIABILITIES' && item.account.toLowerCase().includes('current')
    ).reduce((sum, item) => sum + item.current_amount, 0);
    
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    const mappedEntries = currentPeriodEntries.filter(entry => entry.mapping_id);
    const mappingPercentage = currentPeriodEntries.length > 0 
      ? (mappedEntries.length / currentPeriodEntries.length) * 100 
      : 0;

    return [
      { 
        title: "Total Assets", 
        value: `₹${(totalAssets / 100000).toFixed(1)}L`, 
        change: "+12%", 
        icon: TrendingUp 
      },
      { 
        title: "Mapping Completeness", 
        value: `${mappingPercentage.toFixed(1)}%`, 
        change: mappingPercentage >= 80 ? "Ready" : "Incomplete", 
        icon: BarChart3 
      },
      { 
        title: "Current Ratio", 
        value: currentRatio.toFixed(2), 
        change: currentRatio > 1 ? "+8%" : "-8%", 
        icon: PieChart 
      },
      { 
        title: "Trial Balance Entries", 
        value: `${mappedEntries.length}/${currentPeriodEntries.length}`, 
        change: mappingPercentage >= 80 ? "Complete" : "Needs mapping", 
        icon: FileText 
      }
    ];
  }, [hasData, selectedPeriodId, getTotalAssets, getTotalRevenue, getTotalExpenses, getBalanceSheetData, trialBalanceEntries]);

  const reportTypes = useMemo(() => {
    return [
      {
        id: "balance-sheet",
        title: "Enhanced Balance Sheet",
        description: "Assets, liabilities, and equity analysis",
        icon: BarChart3,
        status: hasData() ? "active" : "pending",
        lastGenerated: hasData() ? "Data available" : "No data uploaded"
      },
      {
        id: "ratio-analysis",
        title: "Financial Ratio Analysis", 
        description: "Key performance indicators and metrics",
        icon: TrendingUp,
        status: hasData() ? "active" : "pending",
        lastGenerated: hasData() ? "Data available" : "No data uploaded"
      },
      {
        id: "profit-loss",
        title: "Profit & Loss Statement",
        description: "Revenue and expense breakdown",
        icon: FileText,
        status: hasData() ? "active" : "pending", 
        lastGenerated: hasData() ? "Data available" : "No data uploaded"
      },
      {
        id: "cash-flow",
        title: "Cash Flow Statement",
        description: "Operating, investing, and financing activities",
        icon: PieChart,
        status: "pending",
        lastGenerated: "Requires additional mapping"
      }
    ];
  }, [hasData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive financial analysis and reporting dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DataFreshnessIndicator />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <ExportAllReports />
          </div>
        </div>

        {/* Period Selection with Enhanced Information */}
        <div className="mb-6">
          <EnhancedPeriodSelector
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
            loading={loading}
          />
        </div>

        {/* Period Readiness Warnings */}
        {periodReadiness && !periodReadiness.is_ready && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Period Not Ready for Reporting</div>
                <div className="text-sm">
                  {periodReadiness.warnings?.map((warning: any, index: number) => (
                    <div key={index}>• {warning.message}</div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Complete the mapping below to generate accurate financial reports.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Mapping Interface (shown when mapping is incomplete) */}
        {selectedPeriodId && periodReadiness && !periodReadiness.is_ready && (
          <div className="mb-6">
            <AccountMappingInterface 
              periodId={selectedPeriodId} 
              onMappingUpdate={() => {
                checkPeriodReadiness();
                refetch();
              }}
            />
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <p className="text-xs text-muted-foreground">{metric.change}</p>
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Available Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
            <p className="text-muted-foreground">
              Select a report type to view detailed financial analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <Card 
                    key={report.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveTab(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-semibold">{report.title}</h3>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                            <p className="text-xs text-muted-foreground">Status: {report.lastGenerated}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Reports Section - Only show if period is ready or forcing to show */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" disabled={periodReadiness && !periodReadiness.is_ready}>
              Overview {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="balance-sheet" disabled={periodReadiness && !periodReadiness.is_ready}>
              Balance Sheet {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="ratio-analysis" disabled={periodReadiness && !periodReadiness.is_ready}>
              Ratio Analysis {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="profit-loss" disabled={periodReadiness && !periodReadiness.is_ready}>
              P&L {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="stock-data" disabled={periodReadiness && !periodReadiness.is_ready}>
              Stock Data {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="cash-flow" disabled={periodReadiness && !periodReadiness.is_ready}>
              Cash Flow {periodReadiness && !periodReadiness.is_ready && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            
            {!hasData() ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Financial Data Available</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Upload your trial balance data to begin generating comprehensive financial reports and analysis.
                  </p>
                </CardContent>
              </Card>
            ) : periodReadiness && !periodReadiness.is_ready ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Complete Account Mapping Required</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    This period requires {periodReadiness.mapping_percentage?.toFixed(1)}% mapping completion. 
                    Complete the account mapping above to generate accurate financial reports.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {periodReadiness.mapped_entries} of {periodReadiness.total_entries} entries mapped
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <SimpleRatioAnalysis />
                <EnhancedBalanceSheet />
              </div>
            )}
          </TabsContent>

          <TabsContent value="balance-sheet" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            {!hasData() ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">Upload trial balance data to view balance sheet.</p>
                </CardContent>
              </Card>
            ) : (
              <EnhancedBalanceSheet />
            )}
          </TabsContent>

          <TabsContent value="ratio-analysis" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            {!hasData() ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">Upload trial balance data to view ratio analysis.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <SimpleRatioAnalysis />
                <RatioAnalysisDashboard />
              </div>
            )}
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            {!hasData() ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">Upload trial balance data to view profit & loss statement.</p>
                </CardContent>
              </Card>
            ) : (
              <EnhancedProfitAndLoss />
            )}
          </TabsContent>

          <TabsContent value="stock-data" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            <StockReconciliationView periodId={selectedPeriodId} />
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-6">
            <DataQualityIndicator periodId={selectedPeriodId} />
            <CashFlowStatement periodId={selectedPeriodId} />
          </TabsContent>

          <TabsContent value="benchmark" className="space-y-6">
            <BenchmarkSettings />
          </TabsContent>
        </Tabs>

        <ReportSettings
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      </div>
    </div>
  );
};

export default Reports;