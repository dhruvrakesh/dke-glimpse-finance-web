import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  PieChart,
  Target,
  Zap
} from "lucide-react";

interface AnalysisData {
  totalEntries: number;
  accountTypeDistribution: Record<string, number>;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  dataQualityScore: number;
  insights: string[];
  recommendations: string[];
  outliers: {
    ledger_name: string;
    confidence_score: number;
    reason: string;
  }[];
}

export const IntelligentAnalysisDashboard = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateAnalysis();
  }, []);

  const generateAnalysis = async () => {
    try {
      setLoading(true);
      
      const { data: entries, error } = await supabase
        .from('trial_balance_entries')
        .select('*');

      if (error) throw error;

      if (!entries || entries.length === 0) {
        setAnalysisData(null);
        return;
      }

      // Calculate account type distribution
      const typeDistribution: Record<string, number> = {};
      entries.forEach(entry => {
        typeDistribution[entry.account_type] = (typeDistribution[entry.account_type] || 0) + 1;
      });

      // Calculate confidence distribution
      const confidenceDistribution = {
        high: entries.filter(e => e.confidence_score >= 0.8).length,
        medium: entries.filter(e => e.confidence_score >= 0.6 && e.confidence_score < 0.8).length,
        low: entries.filter(e => e.confidence_score < 0.6).length
      };

      // Calculate data quality score
      const avgConfidence = entries.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / entries.length;
      const completenessScore = entries.filter(e => e.account_type && e.account_category).length / entries.length;
      const dataQualityScore = (avgConfidence * 0.6 + completenessScore * 0.4) * 100;

      // Generate insights
      const insights = generateInsights(entries, typeDistribution);
      const recommendations = generateRecommendations(entries, avgConfidence);
      const outliers = identifyOutliers(entries);

      setAnalysisData({
        totalEntries: entries.length,
        accountTypeDistribution: typeDistribution,
        confidenceDistribution,
        dataQualityScore,
        insights,
        recommendations,
        outliers
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate intelligent analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (entries: any[], typeDistribution: Record<string, number>) => {
    const insights = [];
    
    // Asset vs Liability balance
    const assets = entries.filter(e => e.account_type === 'ASSETS').reduce((sum, e) => sum + e.closing_balance, 0);
    const liabilities = entries.filter(e => e.account_type === 'LIABILITIES').reduce((sum, e) => sum + Math.abs(e.closing_balance), 0);
    
    if (assets > liabilities * 1.5) {
      insights.push("Strong asset position detected - assets significantly exceed liabilities");
    } else if (liabilities > assets) {
      insights.push("High leverage detected - liabilities exceed assets, review debt structure");
    }

    // Revenue vs Expenses
    const revenue = entries.filter(e => e.account_type === 'REVENUE').reduce((sum, e) => sum + Math.abs(e.closing_balance), 0);
    const expenses = entries.filter(e => e.account_type === 'EXPENSES').reduce((sum, e) => sum + e.closing_balance, 0);
    
    if (revenue > expenses * 1.2) {
      insights.push("Healthy profitability - revenue significantly exceeds expenses");
    } else if (expenses > revenue) {
      insights.push("Loss position identified - expenses exceed revenue, review cost structure");
    }

    // Account distribution insights
    const mostCommonType = Object.keys(typeDistribution).reduce((a, b) => 
      typeDistribution[a] > typeDistribution[b] ? a : b
    );
    insights.push(`Majority of accounts are ${mostCommonType} (${typeDistribution[mostCommonType]} accounts)`);

    return insights;
  };

  const generateRecommendations = (entries: any[], avgConfidence: number) => {
    const recommendations = [];
    
    if (avgConfidence < 0.7) {
      recommendations.push("Consider reviewing AI categorization for accounts with low confidence scores");
    }

    const unmappedCount = entries.filter(e => !e.account_category || e.account_category === 'Other').length;
    if (unmappedCount > entries.length * 0.1) {
      recommendations.push("Map remaining uncategorized accounts to improve reporting accuracy");
    }

    const zeroBalanceAccounts = entries.filter(e => e.closing_balance === 0).length;
    if (zeroBalanceAccounts > entries.length * 0.2) {
      recommendations.push("Consider archiving inactive accounts with zero balances");
    }

    recommendations.push("Set up regular trial balance uploads for trend analysis");
    recommendations.push("Implement benchmark comparison with industry standards");

    return recommendations;
  };

  const identifyOutliers = (entries: any[]) => {
    return entries
      .filter(e => e.confidence_score < 0.5)
      .map(e => ({
        ledger_name: e.ledger_name,
        confidence_score: e.confidence_score,
        reason: e.confidence_score < 0.3 ? "Very low AI confidence" : "Low AI confidence"
      }))
      .slice(0, 5); // Top 5 outliers
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <div className="text-lg">Generating intelligent analysis...</div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-2">No Data for Analysis</h2>
          <p className="text-muted-foreground">
            Upload trial balance data to generate intelligent insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered insights and analysis of your trial balance data
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Quality Score</p>
                <p className="text-2xl font-bold">{analysisData.dataQualityScore.toFixed(1)}%</p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>
            <Progress value={analysisData.dataQualityScore} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold">{analysisData.confidenceDistribution.high}</p>
                <p className="text-xs text-muted-foreground">accounts</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medium Confidence</p>
                <p className="text-2xl font-bold">{analysisData.confidenceDistribution.medium}</p>
                <p className="text-xs text-muted-foreground">accounts</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold">{analysisData.confidenceDistribution.low}</p>
                <p className="text-xs text-muted-foreground">accounts</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Account Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analysisData.accountTypeDistribution).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${(count / analysisData.totalEntries) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisData.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Accounts Needing Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisData.outliers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm">All accounts have good confidence scores!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisData.outliers.map((outlier, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{outlier.ledger_name}</p>
                      <p className="text-xs text-muted-foreground">{outlier.reason}</p>
                    </div>
                    <Badge variant="destructive">
                      {(outlier.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};