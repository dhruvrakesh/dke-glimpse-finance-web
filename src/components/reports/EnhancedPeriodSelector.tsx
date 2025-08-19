import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";

interface FinancialPeriod {
  id: number;
  year: number;
  quarter: number;
  entry_count: number;
  mapped_count: number;
  mapping_percentage: number;
  has_data: boolean;
  created_at?: string;
}

interface EnhancedPeriodSelectorProps {
  periods: FinancialPeriod[];
  selectedPeriodId: number | null;
  onPeriodChange: (periodId: number) => void;
  loading?: boolean;
}

export const EnhancedPeriodSelector = ({ 
  periods, 
  selectedPeriodId, 
  onPeriodChange, 
  loading = false 
}: EnhancedPeriodSelectorProps) => {
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const getMappingBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
    if (percentage >= 50) return <Badge variant="outline"><TrendingUp className="h-3 w-3 mr-1" />Partial</Badge>;
    return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Incomplete</Badge>;
  };

  const getPeriodLabel = (period: FinancialPeriod) => {
    return `Q${period.quarter} ${period.year} (${period.entry_count} entries, ${period.mapping_percentage}% mapped)`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Financial Period</div>
        <div className="h-10 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No financial periods with data found. Please upload trial balance data first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Financial Period</label>
        {selectedPeriod && getMappingBadge(selectedPeriod.mapping_percentage)}
      </div>
      
      <Select 
        value={selectedPeriodId?.toString() || ""} 
        onValueChange={(value) => onPeriodChange(Number(value))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a financial period" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem 
              key={period.id} 
              value={period.id.toString()}
              className="flex items-center justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <span>{getPeriodLabel(period)}</span>
                <div className="ml-2">
                  {getMappingBadge(period.mapping_percentage)}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPeriod && selectedPeriod.mapping_percentage < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This period has incomplete mapping ({selectedPeriod.mapping_percentage}% complete). 
            For accurate reports, complete account mapping in the Mapper section.
            {selectedPeriod.mapped_count} of {selectedPeriod.entry_count} entries are mapped.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};