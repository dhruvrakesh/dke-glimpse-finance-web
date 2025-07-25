import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download, Eye, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CashFlowData {
  item_code: string;
  item_name: string;
  category: string;
  cash_flow_category: string;
  current_amount: number;
  previous_amount?: number;
  variance: number;
  variance_percentage: number;
}

interface CashFlowStatementProps {
  periodId?: number;
  comparisonPeriodId?: number;
}

export const CashFlowStatement = ({ periodId, comparisonPeriodId }: CashFlowStatementProps) => {
  const [data, setData] = useState<CashFlowData[]>([]);
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
      fetchCashFlowData();
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

  const fetchCashFlowData = async () => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    try {
      // Fetch current period data from balance_sheet_view for cash flow items
      const { data: currentData, error: currentError } = await supabase
        .from('balance_sheet_view')
        .select('*')
        .eq('period_id', selectedPeriod)
        .in('category', ['Current Assets', 'Current Liabilities', 'Fixed Assets']);

      if (currentError) throw currentError;

      // Fetch comparison period data if selected
      let comparisonData: any[] = [];
      if (selectedComparisonPeriod) {
        const { data: prevData, error: prevError } = await supabase
          .from('balance_sheet_view')
          .select('*')
          .eq('period_id', selectedComparisonPeriod)
          .in('category', ['Current Assets', 'Current Liabilities', 'Fixed Assets']);

        if (prevError) throw prevError;
        comparisonData = prevData || [];
      }

      // Transform balance sheet data into cash flow format
      const transformedData = (currentData || []).map(item => ({
        ...item,
        cash_flow_category: item.category === 'Current Assets' ? 'OPERATING' :
                           item.category === 'Current Liabilities' ? 'OPERATING' : 'INVESTING',
        current_amount: item.net_amount || 0
      }));

      const processedData = processCurrentPeriodData(transformedData, comparisonData || []);
      setData(processedData);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cash flow data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processCurrentPeriodData = (current: any[], comparison: any[]): CashFlowData[] => {
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
        cash_flow_category: item.cash_flow_category || 'OTHER',
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

  // Group data by cash flow category
  const groupedData = data.reduce((acc, item) => {
    const category = item.cash_flow_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CashFlowData[]>);

  // Calculate totals
  const calculateCategoryTotal = (items: CashFlowData[]) => {
    return items.reduce((sum, item) => sum + item.current_amount, 0);
  };

  const operatingCashFlow = calculateCategoryTotal(groupedData['OPERATING'] || []);
  const investingCashFlow = calculateCategoryTotal(groupedData['INVESTING'] || []);
  const financingCashFlow = calculateCategoryTotal(groupedData['FINANCING'] || []);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'OPERATING':
        return <DollarSign className="h-4 w-4" />;
      case 'INVESTING':
        return <TrendingUp className="h-4 w-4" />;
      case 'FINANCING':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'OPERATING':
        return 'Cash flows from core business operations';
      case 'INVESTING':
        return 'Cash flows from investment activities';
      case 'FINANCING':
        return 'Cash flows from financing activities';
      default:
        return 'Other cash flow activities';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading cash flow data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Cash Flow Statement</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Analysis of cash flows from operating, investing, and financing activities
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Operating</span>
              </div>
              <div className={`text-2xl font-bold ${operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(operatingCashFlow)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Investing</span>
              </div>
              <div className={`text-2xl font-bold ${investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(investingCashFlow)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Financing</span>
              </div>
              <div className={`text-2xl font-bold ${financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financingCashFlow)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Net Cash Flow</span>
              </div>
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFlow)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Details */}
        <div className="space-y-6">
          {Object.entries(groupedData).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                {getCategoryIcon(category)}
                <h3 className="text-lg font-semibold capitalize">{category.toLowerCase()} Activities</h3>
                <Badge variant="outline">
                  {formatCurrency(calculateCategoryTotal(items))}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {getCategoryDescription(category)}
              </p>
              
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

        {/* Net Cash Flow Summary */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Net Cash Flow Summary</h3>
              <div className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFlow)}
              </div>
              <p className="text-sm text-muted-foreground">
                {netCashFlow >= 0 ? 'Positive cash generation' : 'Negative cash generation'} for the period
              </p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};