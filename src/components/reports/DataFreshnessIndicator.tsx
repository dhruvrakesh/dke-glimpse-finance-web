import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";

export const DataFreshnessIndicator = () => {
  const { periods, trialBalanceEntries, loading } = useFinancialData();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading data...
      </div>
    );
  }

  if (trialBalanceEntries.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span>No data available</span>
        <Badge variant="destructive">Empty Database</Badge>
      </div>
    );
  }

  // Since created_at is not available on trial balance entries, 
  // we'll use the financial period information instead
  const mostRecentPeriod = periods[0]; // periods are ordered by most recent first
  const lastUpdated = mostRecentPeriod ? new Date() : null; // Use current time as proxy
  
  if (!lastUpdated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Data timestamp unavailable</span>
      </div>
    );
  }

  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  const getFreshnessStatus = () => {
    // Since we're using current time as proxy, show data as fresh
    if (trialBalanceEntries.length > 0) {
      return { label: "Data loaded", variant: "default" as const, color: "text-green-600" };
    }
    return { label: "No data", variant: "destructive" as const, color: "text-red-600" };
  };

  const status = getFreshnessStatus();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className={`h-4 w-4 ${status.color}`} />
      <span className="text-muted-foreground">Data status:</span>
      <Badge variant={status.variant}>{status.label}</Badge>
      {trialBalanceEntries.length > 0 && (
        <span className="text-xs text-muted-foreground">
          ({trialBalanceEntries.length} entries)
        </span>
      )}
    </div>
  );
};