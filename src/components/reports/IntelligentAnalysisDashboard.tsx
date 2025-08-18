import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface PeriodData {
  id: number;
  quarter: number;
  year: number;
  period_label: string;
}

interface AnalysisMetrics {
  total_accounts: number;
  avg_confidence: number;
  period_detection_accuracy: number;
  data_quality_score: number;
  mapping_completeness: number;
  categorization_distribution: Record<string, number>;
  confidence_distribution: Record<string, number>;
}

export const IntelligentAnalysisDashboard = () => {
  const [periods, setPeriods] = useState<PeriodData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchAnalysisMetrics();
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const { data: periodsData } = await supabase
        .from('financial_periods')
        .select('id, quarter, year')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (periodsData) {
        const formattedPeriods = periodsData.map(p => ({
          ...p,
          period_label: `Q${p.quarter} ${p.year}`
        }));
        setPeriods(formattedPeriods);
        if (formattedPeriods.length > 0) {
          setSelectedPeriod(formattedPeriods[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const fetchAnalysisMetrics = async () => {
    if (!selectedPeriod) return;

    setLoading(true);
    try {
      // Fetch trial balance entries for the selected period
      const { data: entries } = await supabase
        .from('trial_balance_entries')
        .select(`
          id,
          ledger_name,
          account_type,
          account_category,
          gpt_confidence,
          upload_id,
          trial_balance_uploads!inner (
            detected_period,
            period_confidence,
            gpt_confidence_score
          )
        `)
        .eq('period_id', parseInt(selectedPeriod));

      // Fetch mapping completeness
      const { data: mappings } = await supabase
        .from('schedule3_mapping')
        .select('id, trial_balance_ledger_name')
        .not('trial_balance_ledger_name', 'is', null);

      if (entries) {
        const totalAccounts = entries.length;
        const avgConfidence = entries.reduce((sum, entry) => sum + (entry.gpt_confidence || 0), 0) / totalAccounts;
        
        // Calculate categorization distribution
        const categoryDist = entries.reduce((acc, entry) => {
          const type = entry.account_type || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate confidence distribution
        const confidenceDist = entries.reduce((acc, entry) => {
          const confidence = entry.gpt_confidence || 0;
          let bucket = 'Low (0-70%)';
          if (confidence >= 0.9) bucket = 'High (90%+)';
          else if (confidence >= 0.7) bucket = 'Medium (70-89%)';
          
          acc[bucket] = (acc[bucket] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate period detection accuracy from uploads
        const uploads = entries.map(e => e.trial_balance_uploads).filter(Boolean);
        const avgPeriodConfidence = uploads.length > 0 
          ? uploads.reduce((sum, upload) => sum + (upload.period_confidence || 0), 0) / uploads.length 
          : 0;

        // Calculate mapping completeness
        const mappedAccounts = mappings?.length || 0;
        const mappingCompleteness = totalAccounts > 0 ? (mappedAccounts / totalAccounts) * 100 : 0;

        // Calculate overall data quality score
        const dataQualityScore = (avgConfidence + avgPeriodConfidence + (mappingCompleteness / 100)) / 3 * 100;

        setMetrics({
          total_accounts: totalAccounts,
          avg_confidence: avgConfidence * 100,
          period_detection_accuracy: avgPeriodConfidence * 100,
          data_quality_score: dataQualityScore,
          mapping_completeness: mappingCompleteness,
          categorization_distribution: categoryDist,
          confidence_distribution: confidenceDist
        });
      }
    } catch (error) {
      console.error('Error fetching analysis metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Intelligent Analysis Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered insights into your trial balance data quality and processing metrics
          </p>
        </div>
        <Button 
          onClick={fetchAnalysisMetrics} 
          disabled={loading || !selectedPeriod}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Period</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a financial period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id.toString()}>
                  {period.period_label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Accounts</p>
                  <p className="text-2xl font-bold">{metrics.total_accounts}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Confidence</p>
                  <p className="text-2xl font-bold">{metrics.avg_confidence.toFixed(1)}%</p>
                  {getQualityBadge(metrics.avg_confidence)}
                </div>
                <Brain className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Period Detection</p>
                  <p className="text-2xl font-bold">{metrics.period_detection_accuracy.toFixed(1)}%</p>
                  {getQualityBadge(metrics.period_detection_accuracy)}
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Data Quality</p>
                  <p className="text-2xl font-bold">{metrics.data_quality_score.toFixed(1)}%</p>
                  {getQualityBadge(metrics.data_quality_score)}
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribution Charts */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.categorization_distribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${(count / metrics.total_accounts) * 100}%`}}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidence Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.confidence_distribution).map(([bucket, count]) => (
                  <div key={bucket} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{bucket}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${(count / metrics.total_accounts) * 100}%`}}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mapping Completeness */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Completeness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span>Chart of Accounts Mapping Progress</span>
              <span className="font-semibold">{metrics.mapping_completeness.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-300" 
                style={{width: `${metrics.mapping_completeness}%`}}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round((metrics.mapping_completeness / 100) * metrics.total_accounts)} of {metrics.total_accounts} accounts mapped
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Analyzing data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};