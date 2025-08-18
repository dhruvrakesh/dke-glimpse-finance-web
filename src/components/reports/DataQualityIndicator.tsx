import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Database,
  Calculator
} from "lucide-react";

interface DataQualityMetrics {
  period_id: number;
  quarter: number;
  year: number;
  completeness_score: number;
  total_entries: number;
  asset_entries: number;
  liability_entries: number;
  equity_entries: number;
  revenue_entries: number;
  expense_entries: number;
  opening_stock_entries: number;
  closing_stock_entries: number;
  cogs_entries: number;
  stock_data_status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
}

interface StockValidationResult {
  period_id: number;
  opening_stock: number;
  closing_stock: number;
  purchases: number;
  calculated_cogs: number;
  existing_cogs: number;
  cogs_variance: number;
  stock_entries_count: number;
  has_complete_stock_data: boolean;
  validation_status: 'NO_STOCK_DATA' | 'MISSING_STOCK_DETAILS' | 'COGS_MISMATCH' | 'VALIDATED';
}

export const DataQualityIndicator = ({ periodId }: { periodId?: number }) => {
  const [qualityMetrics, setQualityMetrics] = useState<DataQualityMetrics | null>(null);
  const [stockValidation, setStockValidation] = useState<StockValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (periodId) {
      fetchDataQuality();
    }
  }, [periodId]);

  const fetchDataQuality = async () => {
    if (!periodId) return;
    
    try {
      setLoading(true);
      
      // Fetch completeness metrics
      const { data: completenessData, error: completenessError } = await supabase
        .from('financial_completeness_view')
        .select('*')
        .eq('period_id', periodId)
        .single();

      if (completenessError && completenessError.code !== 'PGRST116') {
        throw completenessError;
      }

      setQualityMetrics(completenessData as DataQualityMetrics);

      // Validate stock and COGS
      const { data: stockData, error: stockError } = await supabase.rpc(
        'calculate_cogs_and_validate_stock',
        { period_id_param: periodId }
      );

      if (stockError) throw stockError;
      setStockValidation(stockData as unknown as StockValidationResult);

    } catch (error) {
      console.error('Error fetching data quality:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data quality metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    try {
      await supabase.rpc('refresh_financial_analytics');
      await fetchDataQuality();
      toast({
        title: "Success",
        description: "Analytics refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh analytics",
        variant: "destructive",
      });
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 0.9) return <Badge className="bg-green-100 text-green-800">Excellent ({Math.round(score * 100)}%)</Badge>;
    if (score >= 0.7) return <Badge variant="secondary">Good ({Math.round(score * 100)}%)</Badge>;
    if (score >= 0.5) return <Badge variant="outline">Fair ({Math.round(score * 100)}%)</Badge>;
    return <Badge variant="destructive">Poor ({Math.round(score * 100)}%)</Badge>;
  };

  const getValidationStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Validated</Badge>;
      case 'COGS_MISMATCH':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />COGS Mismatch</Badge>;
      case 'MISSING_STOCK_DETAILS':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Missing Stock Data</Badge>;
      case 'NO_STOCK_DATA':
        return <Badge variant="secondary"><Database className="h-3 w-3 mr-1" />No Stock Data</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Data Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Analyzing data quality...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!qualityMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Data Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No data quality metrics available for this period.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Data Quality Assessment - Q{qualityMetrics.quarter} {qualityMetrics.year}
          </CardTitle>
          <Button onClick={refreshAnalytics} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{qualityMetrics.total_entries}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{getQualityBadge(qualityMetrics.completeness_score)}</div>
              <div className="text-sm text-muted-foreground">Completeness Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{qualityMetrics.stock_data_status}</div>
              <div className="text-sm text-muted-foreground">Stock Data Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stockValidation ? getValidationStatusBadge(stockValidation.validation_status) : '-'}</div>
              <div className="text-sm text-muted-foreground">Validation Status</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="font-medium">Assets</div>
              <div className="text-muted-foreground">{qualityMetrics.asset_entries} entries</div>
            </div>
            <div>
              <div className="font-medium">Liabilities</div>
              <div className="text-muted-foreground">{qualityMetrics.liability_entries} entries</div>
            </div>
            <div>
              <div className="font-medium">Equity</div>
              <div className="text-muted-foreground">{qualityMetrics.equity_entries} entries</div>
            </div>
            <div>
              <div className="font-medium">Revenue</div>
              <div className="text-muted-foreground">{qualityMetrics.revenue_entries} entries</div>
            </div>
            <div>
              <div className="font-medium">Expenses</div>
              <div className="text-muted-foreground">{qualityMetrics.expense_entries} entries</div>
            </div>
          </div>

          {stockValidation && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Stock & COGS Analysis
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">Opening Stock</div>
                  <div className="text-muted-foreground">{formatCurrency(stockValidation.opening_stock)}</div>
                </div>
                <div>
                  <div className="font-medium">Purchases</div>
                  <div className="text-muted-foreground">{formatCurrency(stockValidation.purchases)}</div>
                </div>
                <div>
                  <div className="font-medium">Closing Stock</div>
                  <div className="text-muted-foreground">{formatCurrency(stockValidation.closing_stock)}</div>
                </div>
                <div>
                  <div className="font-medium">Calculated COGS</div>
                  <div className="text-muted-foreground">{formatCurrency(stockValidation.calculated_cogs)}</div>
                </div>
              </div>

              {stockValidation.validation_status === 'COGS_MISMATCH' && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    COGS variance detected: {formatCurrency(Math.abs(stockValidation.cogs_variance))}. 
                    Expected COGS: {formatCurrency(stockValidation.calculated_cogs)}, 
                    Recorded COGS: {formatCurrency(stockValidation.existing_cogs)}
                  </AlertDescription>
                </Alert>
              )}

              {stockValidation.validation_status === 'MISSING_STOCK_DETAILS' && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Missing opening or closing stock entries. This affects profit calculation accuracy.
                    Stock entries found: {stockValidation.stock_entries_count}
                  </AlertDescription>
                </Alert>
              )}

              {stockValidation.validation_status === 'NO_STOCK_DATA' && (
                <Alert className="mt-3">
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    No stock-related entries found. Consider adding inventory data for complete financial analysis.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};