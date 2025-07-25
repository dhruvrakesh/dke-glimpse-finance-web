import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PLData {
  item_code: string;
  item_name: string;
  category: string;
  sub_category: string;
  report_type: string;
  current_amount: number;
  previous_amount?: number;
  variance: number;
  variance_percentage: number;
}

interface EnhancedProfitAndLossProps {
  periodId?: number;
  comparisonPeriodId?: number;
}

export const EnhancedProfitAndLoss = ({ periodId, comparisonPeriodId }: EnhancedProfitAndLossProps) => {
  const [data, setData] = useState<PLData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>(periodId);
  const [selectedComparisonPeriod, setSelectedComparisonPeriod] = useState<number | undefined>(comparisonPeriodId);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPLData();
    }
  }, [selectedPeriod, selectedComparisonPeriod]);

  const fetchPeriods = async () => {
    try {
      const { data: periodsData, error } = await supabase
        .from('financial_periods')
        .select('*')
        .order('end_date', { ascending: false });

      if (error) throw error;
      setPeriods(periodsData || []);
      
      if (!selectedPeriod && periodsData && periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
        if (periodsData.length > 1) {
          setSelectedComparisonPeriod(periodsData[1].id);
        }
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

  const fetchPLData = async () => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    try {
      // Fetch current period data from P&L view
      const { data: currentData, error: currentError } = await supabase
        .from('profit_and_loss_view')
        .select('*')
        .eq('period_id', selectedPeriod);

      if (currentError) throw currentError;

      // Fetch comparison period data if selected
      let comparisonData: any[] = [];
      if (selectedComparisonPeriod) {
        const { data: prevData, error: prevError } = await supabase
          .from('profit_and_loss_view')
          .select('*')
          .eq('period_id', selectedComparisonPeriod);

        if (prevError) throw prevError;
        comparisonData = prevData || [];
      }

      // Process and merge data
      const processedData = processCurrentPeriodData(currentData || [], comparisonData);
      setData(processedData);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profit and loss data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processCurrentPeriodData = (current: any[], comparison: any[]): PLData[] => {
    const comparisonMap = new Map(
      comparison.map(item => [item.item_code, item])
    );

    return current.map(item => {
      const compareItem = comparisonMap.get(item.item_code);
      const currentAmount = item.net_amount || 0;
      const previousAmount = compareItem?.net_amount || 0;
      const variance = currentAmount - previousAmount;
      const variancePercentage = previousAmount !== 0 ? (variance / Math.abs(previousAmount)) * 100 : 0;

      return {
        item_code: item.item_code || 'UNKNOWN',
        item_name: item.item_name || item.ledger_name || 'Unknown Item',
        category: item.category || 'Other',
        sub_category: item.sub_category || '',
        report_type: item.report_type || 'OTHER',
        current_amount: currentAmount,
        previous_amount: previousAmount,
        variance,
        variance_percentage: variancePercentage
      };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const renderVarianceIndicator = (variance: number, percentage: number) => {
    if (Math.abs(variance) < 1000) return null;
    
    const isPositive = variance > 0;
    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {formatPercentage(percentage)}
        </span>
      </div>
    );
  };

  // Group data by report type
  const groupedData = data.reduce((acc, item) => {
    const type = item.report_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, PLData[]>);

  // Calculate totals
  const calculateTypeTotal = (items: PLData[]) => {
    return items.reduce((sum, item) => sum + item.current_amount, 0);
  };

  const incomeTotal = calculateTypeTotal(groupedData['INCOME'] || []);
  const expensesTotal = calculateTypeTotal(groupedData['EXPENSES'] || []);
  const grossProfit = incomeTotal - expensesTotal;
  const grossProfitMargin = incomeTotal !== 0 ? (grossProfit / incomeTotal) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading profit and loss data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Enhanced Profit & Loss Statement</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive income and expense analysis with variance reporting
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection */}
        <div className="flex gap-4 items-center">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Period</label>
            <Select value={selectedPeriod?.toString()} onValueChange={(value) => setSelectedPeriod(Number(value))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id.toString()}>
                    {period.period_name} ({new Date(period.start_date).getFullYear()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Comparison Period</label>
            <Select value={selectedComparisonPeriod?.toString()} onValueChange={(value) => setSelectedComparisonPeriod(Number(value))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select comparison period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Comparison</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id.toString()}>
                    {period.period_name} ({new Date(period.start_date).getFullYear()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(incomeTotal)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(expensesTotal)}</div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)}
              </div>
              <p className="text-sm text-muted-foreground">
                Gross Profit ({formatPercentage(grossProfitMargin)})
              </p>
            </CardContent>
          </Card>
        </div>

        {/* P&L Table */}
        <div className="space-y-6">
          {Object.entries(groupedData).map(([reportType, items]) => (
            <div key={reportType}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold capitalize">{reportType.toLowerCase()}</h3>
                <Badge variant="outline">
                  {formatCurrency(calculateTypeTotal(items))}
                </Badge>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Amount</TableHead>
                    {selectedComparisonPeriod && (
                      <>
                        <TableHead className="text-right">Previous Amount</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-center">Trend</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.item_code}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-sm text-muted-foreground">{item.item_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                        {item.sub_category && (
                          <div className="text-xs text-muted-foreground mt-1">{item.sub_category}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.current_amount)}
                      </TableCell>
                      {selectedComparisonPeriod && (
                        <>
                          <TableCell className="text-right">
                            {formatCurrency(item.previous_amount || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.variance)}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderVarianceIndicator(item.variance, item.variance_percentage)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};