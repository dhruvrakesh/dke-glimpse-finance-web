import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  FileSpreadsheet, 
  DollarSign,
  Download,
  Settings,
  Calendar,
  Target,
  Eye
} from "lucide-react";
import { EnhancedBalanceSheet } from "@/components/reports/EnhancedBalanceSheet";
import { RatioAnalysisDashboard } from "@/components/reports/RatioAnalysisDashboard";
import { BalanceSheetDisplay } from "@/components/BalanceSheetDisplay";
import { ProfitAndLossDisplay } from "@/components/ProfitAndLossDisplay";
import { EnhancedProfitAndLoss } from "@/components/reports/EnhancedProfitAndLoss";
import { CashFlowStatement } from "@/components/reports/CashFlowStatement";
import { ReportExporter } from "@/components/reports/ReportExporter";
import { MappingStatsCard } from "@/components/MappingStats";
import { BenchmarkSettings } from "@/components/reports/BenchmarkSettings";
import { ReportSettings } from "@/components/reports/ReportSettings";
import { ExportAllReports } from "@/components/reports/ExportAllReports";

export default function Reports() {
  const [activeReport, setActiveReport] = useState("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const reportMetrics = [
    {
      title: "Total Assets",
      value: "₹516.6 Cr",
      change: "+12.3%",
      changeType: "positive" as const,
      icon: DollarSign,
    },
    {
      title: "Net Profit Margin", 
      value: "18.5%",
      change: "+2.1%",
      changeType: "positive" as const,
      icon: TrendingUp,
    },
    {
      title: "Current Ratio",
      value: "2.4x",
      change: "-0.3x",
      changeType: "negative" as const,
      icon: Target,
    },
    {
      title: "Reports Generated",
      value: "247",
      change: "+15",
      changeType: "positive" as const,
      icon: FileSpreadsheet,
    },
  ];

  const reportTypes = [
    {
      id: "balance-sheet",
      title: "Enhanced Balance Sheet",
      description: "Comprehensive financial position with variance analysis",
      icon: BarChart3,
      status: "active",
      lastGenerated: "2 hours ago"
    },
    {
      id: "ratio-analysis", 
      title: "Financial Ratio Analysis",
      description: "Key performance indicators and health metrics",
      icon: TrendingUp,
      status: "active",
      lastGenerated: "1 hour ago"
    },
    {
      id: "profit-loss",
      title: "Profit & Loss Statement", 
      description: "Revenue, expenses and profitability analysis",
      icon: DollarSign,
      status: "draft",
      lastGenerated: "3 hours ago"
    },
    {
      id: "cash-flow",
      title: "Cash Flow Statement",
      description: "Operating, investing and financing activities", 
      icon: Calendar,
      status: "pending",
      lastGenerated: "1 day ago"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Enterprise Financial Reports</h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive financial analysis and reporting dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <ExportAllReports />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <div className="flex items-center space-x-1">
                        <span
                          className={`text-sm font-medium ${
                            metric.changeType === "positive"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {metric.change}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          vs last quarter
                        </span>
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Types Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Available Reports</CardTitle>
            <p className="text-muted-foreground">
              Enterprise-grade financial reports with advanced analytics
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <Card 
                    key={report.id} 
                    className="border-2 hover:border-primary/20 transition-colors cursor-pointer"
                    onClick={() => setActiveReport(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{report.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {report.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last generated: {report.lastGenerated}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            report.status === 'active' ? 'default' :
                            report.status === 'draft' ? 'secondary' : 'outline'
                          }
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Reports Section */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeReport} onValueChange={setActiveReport} className="w-full">
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-6 rounded-none bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="balance-sheet"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Balance Sheet
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ratio-analysis"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Ratio Analysis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profit-loss"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    P&L Statement
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cash-flow"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Cash Flow
                  </TabsTrigger>
                  <TabsTrigger 
                    value="benchmark-settings"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Benchmark Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <h2 className="text-2xl font-bold mb-2">Financial Reporting Overview</h2>
                      <p className="text-muted-foreground mb-6">
                        Select a report type above to view detailed financial analysis
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Current Data Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>Trial Balance Entries</span>
                                <Badge variant="default">₹516.6 Cr</Badge>
                              </div>
                              <MappingStatsCard />
                              <div className="flex justify-between">
                                <span>Financial Period</span>
                                <Badge variant="outline">Q2 2025</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Report Generation Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>Balance Sheet</span>
                                <Badge variant="default">Ready</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Ratio Analysis</span>
                                <Badge variant="default">Ready</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Cash Flow</span>
                                <Badge variant="secondary">Pending Mapping</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="balance-sheet" className="mt-0 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Enhanced Balance Sheet</h2>
                    <ReportExporter 
                      reportType="balance-sheet" 
                      title="Enhanced Balance Sheet"
                    />
                  </div>
                  <EnhancedBalanceSheet />
                </TabsContent>

                <TabsContent value="ratio-analysis" className="mt-0 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Financial Ratio Analysis</h2>
                    <ReportExporter 
                      reportType="ratio-analysis" 
                      title="Financial Ratio Analysis"
                    />
                  </div>
                  <RatioAnalysisDashboard />
                </TabsContent>

                <TabsContent value="profit-loss" className="mt-0 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Profit & Loss Statement</h2>
                    <ReportExporter 
                      reportType="profit-loss" 
                      title="Profit & Loss Statement"
                    />
                  </div>
                  <EnhancedProfitAndLoss />
                </TabsContent>

                <TabsContent value="cash-flow" className="mt-0 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Cash Flow Statement</h2>
                    <ReportExporter 
                      reportType="cash-flow" 
                      title="Cash Flow Statement"
                    />
                  </div>
                  <CashFlowStatement />
                </TabsContent>

                <TabsContent value="benchmark-settings" className="mt-0">
                  <BenchmarkSettings />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <ReportSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </div>
  );
}