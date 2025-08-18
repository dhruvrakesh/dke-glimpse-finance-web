import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFinancialData } from '@/hooks/useFinancialData';

export const SimpleRatioAnalysis: React.FC = () => {
  const { getTotalAssets, getTotalLiabilities, getTotalEquity, getTotalRevenue, getTotalExpenses, getCurrentPeriod } = useFinancialData();

  const ratios = useMemo(() => {
    const assets = getTotalAssets();
    const liabilities = getTotalLiabilities();
    const equity = getTotalEquity();
    const revenue = getTotalRevenue();
    const expenses = getTotalExpenses();
    const netIncome = revenue - expenses;

    const currentRatio = liabilities > 0 ? assets / liabilities : 0;
    const debtToEquityRatio = equity > 0 ? liabilities / equity : 0;
    const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
    const roa = assets > 0 ? (netIncome / assets) * 100 : 0;

    const getHealthScore = () => {
      let score = 0;
      if (currentRatio >= 1.5) score += 25;
      else if (currentRatio >= 1.0) score += 15;
      
      if (debtToEquityRatio <= 0.5) score += 25;
      else if (debtToEquityRatio <= 1.0) score += 15;
      
      if (profitMargin >= 20) score += 25;
      else if (profitMargin >= 10) score += 15;
      else if (profitMargin >= 0) score += 5;
      
      if (roa >= 15) score += 25;
      else if (roa >= 5) score += 15;
      else if (roa >= 0) score += 5;
      
      return score;
    };

    return {
      currentRatio,
      debtToEquityRatio,
      profitMargin,
      roa,
      healthScore: getHealthScore()
    };
  }, [getTotalAssets, getTotalLiabilities, getTotalEquity, getTotalRevenue, getTotalExpenses]);

  const currentPeriod = getCurrentPeriod();

  const formatRatio = (value: number, suffix: string = '') => {
    if (value === 0) return 'N/A';
    return `${value.toFixed(2)}${suffix}`;
  };

  const getRatioStatus = (ratio: number, thresholds: { excellent: number; good: number; poor: number }) => {
    if (ratio >= thresholds.excellent) return { color: 'text-green-600', label: 'Excellent' };
    if (ratio >= thresholds.good) return { color: 'text-yellow-600', label: 'Good' };
    if (ratio >= thresholds.poor) return { color: 'text-orange-600', label: 'Fair' };
    return { color: 'text-red-600', label: 'Poor' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financial Ratio Analysis</h2>
          <p className="text-muted-foreground">
            {currentPeriod ? `Analysis for Q${currentPeriod.quarter} ${currentPeriod.year}` : 'Financial health indicators'}
          </p>
        </div>
      </div>

      {/* Financial Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Financial Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Health Score</span>
              <span className="font-semibold">{ratios.healthScore}/100</span>
            </div>
            <Progress value={ratios.healthScore} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {ratios.healthScore >= 80 ? 'Excellent financial health' :
               ratios.healthScore >= 60 ? 'Good financial health' :
               ratios.healthScore >= 40 ? 'Fair financial health' : 'Poor financial health'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatRatio(ratios.currentRatio)}
            </div>
            <div className={`text-sm font-medium mb-2 ${getRatioStatus(ratios.currentRatio, { excellent: 2, good: 1.5, poor: 1 }).color}`}>
              {getRatioStatus(ratios.currentRatio, { excellent: 2, good: 1.5, poor: 1 }).label}
            </div>
            <p className="text-sm text-muted-foreground">
              Assets to Liabilities ratio. Higher is better (ideal: &gt;1.5)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debt-to-Equity Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatRatio(ratios.debtToEquityRatio)}
            </div>
            <div className={`text-sm font-medium mb-2 ${ratios.debtToEquityRatio <= 0.5 ? 'text-green-600' : ratios.debtToEquityRatio <= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
              {ratios.debtToEquityRatio <= 0.5 ? 'Excellent' : ratios.debtToEquityRatio <= 1 ? 'Good' : 'High Risk'}
            </div>
            <p className="text-sm text-muted-foreground">
              Leverage ratio. Lower is better (ideal: &lt;0.5)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatRatio(ratios.profitMargin, '%')}
            </div>
            <div className={`text-sm font-medium mb-2 ${getRatioStatus(ratios.profitMargin, { excellent: 20, good: 10, poor: 0 }).color}`}>
              {getRatioStatus(ratios.profitMargin, { excellent: 20, good: 10, poor: 0 }).label}
            </div>
            <p className="text-sm text-muted-foreground">
              Net income as % of revenue. Your current margin shows strong profitability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Return on Assets (ROA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatRatio(ratios.roa, '%')}
            </div>
            <div className={`text-sm font-medium mb-2 ${getRatioStatus(ratios.roa, { excellent: 15, good: 5, poor: 0 }).color}`}>
              {getRatioStatus(ratios.roa, { excellent: 15, good: 5, poor: 0 }).label}
            </div>
            <p className="text-sm text-muted-foreground">
              How efficiently assets generate profit. Higher indicates better asset utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Key Insights:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  Your profit margin of {ratios.profitMargin.toFixed(1)}% shows {ratios.profitMargin > 50 ? 'exceptional' : ratios.profitMargin > 20 ? 'strong' : 'moderate'} profitability
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  Current ratio of {ratios.currentRatio.toFixed(2)} indicates {ratios.currentRatio > 1.5 ? 'strong liquidity' : ratios.currentRatio > 1 ? 'adequate liquidity' : 'potential liquidity concerns'}
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  Asset utilization (ROA: {ratios.roa.toFixed(1)}%) shows {ratios.roa > 10 ? 'excellent' : ratios.roa > 5 ? 'good' : 'room for improvement in'} efficiency
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};