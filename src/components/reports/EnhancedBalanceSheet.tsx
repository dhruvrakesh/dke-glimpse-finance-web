import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BalanceSheetData {
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

interface EnhancedBalanceSheetProps {
  periodId?: number;
  comparisonPeriodId?: number;
}

export const EnhancedBalanceSheet = ({ periodId, comparisonPeriodId }: EnhancedBalanceSheetProps) => {
  const [data, setData] = useState<BalanceSheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialityThreshold, setMaterialityThreshold] = useState<number>(1000000); // 10 lakhs
  const [showImmaterial, setShowImmaterial] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>(periodId);
  const [selectedComparisonPeriod, setSelectedComparisonPeriod] = useState<number | undefined>(comparisonPeriodId);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeriods();
    fetchMaterialitySettings();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchBalanceSheetData();
    }
  }, [selectedPeriod, selectedComparisonPeriod, materialityThreshold]);

  const fetchPeriods = async () => {
    try {
      const { data: periodsData, error } = await supabase
        .from('financial_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

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
      toast({ title: "Error", description: "Failed to fetch financial periods", variant: "destructive" });
    }
  };

  const fetchMaterialitySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('materiality_settings')
        .select('*')
        .eq('applicable_to', 'BALANCE_SHEET')
        .eq('is_active', true)
        .order('threshold_value', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setMaterialityThreshold(Number(data[0].threshold_value));
      }
    } catch (error) {
      console.error('Error fetching materiality settings:', error);
    }
  };

  const fetchBalanceSheetData = async () => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    try {
      // Use the new materialized view for better performance
      const { data: currentData, error: currentError } = await supabase
        .from('balance_sheet_view')
        .select('*')
        .eq('period_id', selectedPeriod);

      if (currentError) throw currentError;

      // Fetch comparison period data if selected
      let comparisonData: any[] = [];
      if (selectedComparisonPeriod) {
        const { data: prevData, error: prevError } = await supabase
          .from('balance_sheet_view')
          .select('*')
          .eq('period_id', selectedComparisonPeriod);

        if (prevError) throw prevError;
        comparisonData = prevData || [];
      }

      // Process and combine data using the materialized view
      const processedData: BalanceSheetData[] = [];
      const currentGrouped = groupByItemCode(currentData || []);
      const comparisonGrouped = groupByItemCode(comparisonData);

      Object.keys(currentGrouped).forEach(itemCode => {
        const current = currentGrouped[itemCode];
        const previous = comparisonGrouped[itemCode];
        
        const currentAmount = current.totalAmount;
        const previousAmount = previous?.totalAmount || 0;
        const variance = currentAmount - previousAmount;
        const variancePercentage = previousAmount !== 0 ? (variance / Math.abs(previousAmount)) * 100 : 0;

        processedData.push({
          item_code: current.item_code,
          item_name: current.item_name,
          category: current.category,
          sub_category: current.sub_category,
          report_type: current.report_type,
          current_amount: currentAmount,
          previous_amount: previousAmount,
          variance,
          variance_percentage: variancePercentage
        });
      });

      setData(processedData);
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      toast({ title: "Error", description: "Failed to fetch balance sheet data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const groupByItemCode = (data: any[]) => {
    const grouped: Record<string, any> = {};
    
    data.forEach(entry => {
      const itemCode = entry.item_code;
      
      if (!grouped[itemCode]) {
        grouped[itemCode] = {
          item_code: itemCode,
          item_name: entry.item_name,
          category: entry.category,
          sub_category: entry.sub_category,
          report_type: entry.report_type,
          totalAmount: 0
        };
      }
      
      // Use the pre-calculated net_amount from the materialized view
      grouped[itemCode].totalAmount += entry.net_amount || 0;
    });
    
    return grouped;
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

  const isMaterial = (amount: number) => {
    return Math.abs(amount) >= materialityThreshold;
  };

  const filteredData = showImmaterial ? data : data.filter(item => isMaterial(item.current_amount));

  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BalanceSheetData[]>);

  const calculateCategoryTotal = (items: BalanceSheetData[]) => {
    return items.reduce((sum, item) => sum + item.current_amount, 0);
  };

  const renderVarianceIndicator = (variance: number, percentage: number) => {
    if (Math.abs(percentage) < 1) return null;
    
    const isPositive = variance > 0;
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span className="text-sm font-medium">{formatPercentage(percentage)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading enhanced balance sheet...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Enhanced Balance Sheet</CardTitle>
              <p className="text-muted-foreground">Comprehensive financial position with variance analysis</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">Current Period</label>
              <Select value={selectedPeriod?.toString()} onValueChange={(value) => setSelectedPeriod(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      Q{period.quarter} {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Comparison Period</label>
              <Select value={selectedComparisonPeriod?.toString() || "none"} onValueChange={(value) => setSelectedComparisonPeriod(value === "none" ? undefined : Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      Q{period.quarter} {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowImmaterial(!showImmaterial)}
              >
                {showImmaterial ? 'Hide' : 'Show'} Immaterial Items
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet Data */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Account</TableHead>
                <TableHead className="text-right">Current Amount</TableHead>
                {selectedComparisonPeriod && (
                  <>
                    <TableHead className="text-right">Previous Amount</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </>
                )}
                <TableHead className="text-center">Material</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedData).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={selectedComparisonPeriod ? 6 : 3} className="font-semibold text-lg">
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <span className="ml-2 text-muted-foreground">
                        ({formatCurrency(calculateCategoryTotal(items))})
                      </span>
                    </TableCell>
                  </TableRow>
                  
                  {/* Category Items */}
                  {items.map((item) => (
                    <TableRow key={item.item_code}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-sm text-muted-foreground">{item.item_code}</div>
                        </div>
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
                            <span className={item.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(item.variance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {renderVarianceIndicator(item.variance, item.variance_percentage)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-center">
                        <Badge variant={isMaterial(item.current_amount) ? "default" : "secondary"}>
                          {isMaterial(item.current_amount) ? "Material" : "Immaterial"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Category Total */}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">
                      Total {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(calculateCategoryTotal(items))}
                    </TableCell>
                    {selectedComparisonPeriod && (
                      <TableCell colSpan={3}></TableCell>
                    )}
                    <TableCell></TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.filter(item => item.category?.includes('ASSET')).reduce((sum, item) => sum + item.current_amount, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.filter(item => item.category?.includes('LIABILITY')).reduce((sum, item) => sum + item.current_amount, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Liabilities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.filter(item => item.category?.includes('EQUITY')).reduce((sum, item) => sum + item.current_amount, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Equity</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};