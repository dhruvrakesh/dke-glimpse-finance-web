import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RatioData {
  id: string;
  ratio_name: string;
  ratio_category: string;
  calculated_value: number;
  target_value?: number;
  benchmark_value?: number;
  industry_average?: number;
  formula_description: string;
  calculation_date: string;
  performance_status: 'excellent' | 'good' | 'warning' | 'poor';
  trend_direction: 'up' | 'down' | 'stable';
  hasCustomBenchmark?: boolean;
  benchmarkSource?: string;
}

interface RatioTrendData {
  period: string;
  [key: string]: string | number;
}

export const RatioAnalysisDashboard = () => {
  const [ratios, setRatios] = useState<RatioData[]>([]);
  const [trendData, setTrendData] = useState<RatioTrendData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<number>();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const ratioCategories = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'LIQUIDITY', label: 'Liquidity Ratios' },
    { value: 'PROFITABILITY', label: 'Profitability Ratios' },
    { value: 'EFFICIENCY', label: 'Efficiency Ratios' },
    { value: 'LEVERAGE', label: 'Leverage Ratios' }
  ];

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchRatioData();
      fetchTrendData();
    }
  }, [selectedPeriod, selectedCategory]);

  const fetchPeriods = async () => {
    try {
      const { data: periodsData, error } = await supabase
        .from('financial_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (error) throw error;
      setPeriods(periodsData || []);
      
      if (periodsData && periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({ title: "Error", description: "Failed to fetch financial periods", variant: "destructive" });
    }
  };

  const fetchRatioData = async () => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    try {
      // First check if there are any mappings - prerequisite for meaningful ratios
      const { data: mappingsCheck, error: mappingsError } = await supabase
        .from('schedule3_mapping')
        .select('id')
        .limit(1);
      
      if (mappingsError) throw mappingsError;
      
      // If no mappings exist, clear ratios and return
      if (!mappingsCheck || mappingsCheck.length === 0) {
        setRatios([]);
        setLoading(false);
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch calculated ratios with ratio definitions
      let query = supabase
        .from('calculated_ratios')
        .select(`
          *,
          ratio_definitions!inner(
            id,
            ratio_name,
            ratio_category,
            formula_description,
            target_value,
            benchmark_value,
            industry_average
          )
        `)
        .eq('period_id', selectedPeriod);

      if (selectedCategory !== 'ALL') {
        query = query.eq('ratio_definitions.ratio_category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user benchmarks if user is authenticated
      let userBenchmarks: any[] = [];
      if (user) {
        const { data: benchmarksData, error: benchmarksError } = await supabase
          .from('user_ratio_benchmarks')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!benchmarksError) {
          userBenchmarks = benchmarksData || [];
        }
      }

      const processedRatios: RatioData[] = (data || []).map(item => {
        const ratio = item.ratio_definitions;
        
        // Check for user-defined benchmarks
        const userBenchmark = userBenchmarks.find(
          b => b.ratio_definition_id === ratio.id
        );
        
        // Use custom benchmarks if available, otherwise fall back to defaults
        const targetValue = userBenchmark?.custom_target_value ?? ratio.target_value;
        const benchmarkValue = userBenchmark?.custom_industry_average ?? ratio.benchmark_value;
        const industryAverage = userBenchmark?.custom_industry_average ?? ratio.industry_average;
        
        const performanceStatus = getPerformanceStatus(item.calculated_value, ratio.ratio_name, targetValue, benchmarkValue);
        const trendDirection = getTrendDirection(item.calculated_value, ratio.ratio_name, benchmarkValue);

        return {
          id: item.id,
          ratio_name: ratio.ratio_name,
          ratio_category: ratio.ratio_category,
          calculated_value: item.calculated_value,
          target_value: targetValue,
          benchmark_value: benchmarkValue,
          industry_average: industryAverage,
          formula_description: ratio.formula_description,
          calculation_date: item.calculation_date,
          performance_status: performanceStatus,
          trend_direction: trendDirection,
          hasCustomBenchmark: !!userBenchmark,
          benchmarkSource: userBenchmark?.benchmark_source || 'Default'
        };
      });

      setRatios(processedRatios);
    } catch (error) {
      console.error('Error fetching ratio data:', error);
      toast({ title: "Error", description: "Failed to fetch ratio analysis data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const { data, error } = await supabase
        .from('calculated_ratios')
        .select(`
          calculated_value,
          financial_periods!inner(year, quarter),
          ratio_definitions!inner(ratio_name, ratio_category)
        `)
        .order('year', { referencedTable: 'financial_periods', ascending: true })
        .order('quarter', { referencedTable: 'financial_periods', ascending: true });

      if (error) throw error;

      const trendMap: Record<string, RatioTrendData> = {};
      
      (data || []).forEach(item => {
        const period = `Q${item.financial_periods.quarter} ${item.financial_periods.year}`;
        const ratioName = item.ratio_definitions.ratio_name;
        
        if (!trendMap[period]) {
          trendMap[period] = { period };
        }
        
        trendMap[period][ratioName] = item.calculated_value;
      });

      setTrendData(Object.values(trendMap));
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const getPerformanceStatus = (value: number, ratioName: string, target?: number, benchmark?: number): 'excellent' | 'good' | 'warning' | 'poor' => {
    if (!target && !benchmark) return 'good';
    
    const compareValue = target || benchmark || 0;
    const isHigherBetter = isHigherBetterRatio(ratioName);
    
    // For ratios where higher is better
    if (isHigherBetter) {
      if (value >= compareValue * 1.1) return 'excellent';
      if (value >= compareValue * 0.9) return 'good';
      if (value >= compareValue * 0.7) return 'warning';
      return 'poor';
    } 
    // For ratios where lower is better (like Debt to Equity)
    else {
      if (value <= compareValue * 0.8) return 'excellent';
      if (value <= compareValue * 1.0) return 'good';
      if (value <= compareValue * 1.3) return 'warning';
      return 'poor';
    }
  };

  const isHigherBetterRatio = (ratioName: string): boolean => {
    const lowerName = ratioName.toLowerCase();
    const higherBetterRatios = [
      'current ratio',
      'quick ratio', 
      'asset turnover',
      'gross profit margin',
      'net profit margin',
      'return on assets',
      'return on equity'
    ];
    
    const lowerBetterRatios = [
      'debt to equity',
      'debt ratio',
      'debt to assets'
    ];
    
    // Check if it's a lower-is-better ratio
    if (lowerBetterRatios.some(ratio => lowerName.includes(ratio))) {
      return false;
    }
    
    // Default to higher-is-better for most financial ratios
    return true;
  };

  const getTrendDirection = (current: number, ratioName: string, benchmark?: number): 'up' | 'down' | 'stable' => {
    if (!benchmark) return 'stable';
    
    const difference = current - benchmark;
    const threshold = isHigherBetterRatio(ratioName) ? 0.1 : 0.05;
    
    if (Math.abs(difference) < threshold) return 'stable';
    return difference > 0 ? 'up' : 'down';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'poor': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const formatRatioValue = (value: number, ratioName: string) => {
    if (ratioName.toLowerCase().includes('margin') || ratioName.toLowerCase().includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const calculateHealthScore = () => {
    if (ratios.length === 0) return 0;
    
    const scores = {
      excellent: 100,
      good: 75,
      warning: 50,
      poor: 25
    };
    
    const totalScore = ratios.reduce((sum, ratio) => sum + scores[ratio.performance_status], 0);
    return Math.round(totalScore / ratios.length);
  };

  const filteredRatios = selectedCategory === 'ALL' 
    ? ratios 
    : ratios.filter(ratio => ratio.ratio_category === selectedCategory);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading ratio analysis...</div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (ratios.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Financial Ratio Analysis</CardTitle>
            <p className="text-muted-foreground">
              Comprehensive analysis of financial performance and health indicators
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Financial Period</label>
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
                <label className="text-sm font-medium">Ratio Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ratioCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Ratio Data Available</h3>
                <p className="text-muted-foreground mt-2">
                  To see financial ratio analysis, you need:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Financial periods with trial balance data</li>
                  <li>• Account mappings to Schedule 3 items</li>
                  <li>• Calculated financial ratios</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Start by uploading trial balance data and creating mappings in the Data Seeder or Mapper sections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Financial Ratio Analysis</CardTitle>
          <p className="text-muted-foreground">
            Comprehensive analysis of financial performance and health indicators
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Financial Period</label>
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
              <label className="text-sm font-medium">Ratio Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ratioCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Progress value={calculateHealthScore()} className="h-3" />
            </div>
            <div className="text-2xl font-bold">
              {calculateHealthScore()}/100
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {filteredRatios.length} financial ratios compared to industry benchmarks
          </p>
        </CardContent>
      </Card>

      {/* Ratio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRatios.map((ratio) => (
          <Card key={ratio.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{ratio.ratio_name}</CardTitle>
                {getTrendIcon(ratio.trend_direction)}
              </div>
              <div className="flex gap-2">
                <Badge className={`w-fit ${getStatusColor(ratio.performance_status)}`}>
                  {getStatusIcon(ratio.performance_status)}
                  <span className="ml-1">{ratio.performance_status}</span>
                </Badge>
                {ratio.hasCustomBenchmark && (
                  <Badge variant="outline" className="text-xs">
                    Custom {ratio.benchmarkSource}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {formatRatioValue(ratio.calculated_value, ratio.ratio_name)}
                  </div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ratio.target_value && (
                    <div>
                      <div className="text-muted-foreground">Target</div>
                      <div className="font-medium">{formatRatioValue(ratio.target_value, ratio.ratio_name)}</div>
                    </div>
                  )}
                  {ratio.industry_average && (
                    <div>
                      <div className="text-muted-foreground">Industry Avg</div>
                      <div className="font-medium">{formatRatioValue(ratio.industry_average, ratio.ratio_name)}</div>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{ratio.formula_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Analysis */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ratio Trends</CardTitle>
            <p className="text-muted-foreground">Historical performance across financial periods</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                {filteredRatios.slice(0, 4).map((ratio, index) => (
                  <Line
                    key={ratio.ratio_name}
                    type="monotone"
                    dataKey={ratio.ratio_name}
                    stroke={`hsl(${index * 90}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Performance vs Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredRatios.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ratio_name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calculated_value" name="Current" fill="hsl(var(--primary))">
                {filteredRatios.slice(0, 6).map((ratio, index) => (
                  <Cell key={`cell-${index}`} fill={
                    ratio.performance_status === 'excellent' ? '#10b981' :
                    ratio.performance_status === 'good' ? '#3b82f6' :
                    ratio.performance_status === 'warning' ? '#f59e0b' : '#ef4444'
                  } />
                ))}
              </Bar>
              <Bar dataKey="target_value" name="Target" fill="hsl(var(--muted))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};