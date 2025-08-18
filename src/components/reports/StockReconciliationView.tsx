import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Minus,
  RotateCcw,
  Calculator
} from "lucide-react";

interface StockMovement {
  id: string;
  item_code: string;
  item_name: string;
  movement_type: 'OPENING_STOCK' | 'PURCHASES' | 'SALES' | 'CLOSING_STOCK' | 'ADJUSTMENT';
  quantity: number;
  unit_cost: number;
  total_value: number;
  movement_date: string;
  reference_document?: string;
  notes?: string;
}

interface StockSummary {
  total_opening: number;
  total_purchases: number;
  total_sales: number;
  total_closing: number;
  total_adjustments: number;
  calculated_cogs: number;
}

export const StockReconciliationView = ({ periodId }: { periodId?: number }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (periodId) {
      fetchStockData();
    }
  }, [periodId]);

  const fetchStockData = async () => {
    if (!periodId) return;
    
    try {
      setLoading(true);
      
      // Fetch stock movements
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('period_id', periodId)
        .order('movement_date', { ascending: true });

      if (movementsError) throw movementsError;
      setMovements((movementsData || []) as StockMovement[]);

      // Calculate summary
      const summary = movementsData?.reduce((acc, movement) => {
        switch (movement.movement_type) {
          case 'OPENING_STOCK':
            acc.total_opening += movement.total_value;
            break;
          case 'PURCHASES':
            acc.total_purchases += movement.total_value;
            break;
          case 'SALES':
            acc.total_sales += movement.total_value;
            break;
          case 'CLOSING_STOCK':
            acc.total_closing += movement.total_value;
            break;
          case 'ADJUSTMENT':
            acc.total_adjustments += movement.total_value;
            break;
        }
        return acc;
      }, {
        total_opening: 0,
        total_purchases: 0,
        total_sales: 0,
        total_closing: 0,
        total_adjustments: 0,
        calculated_cogs: 0
      });

      if (summary) {
        summary.calculated_cogs = summary.total_opening + summary.total_purchases - summary.total_closing;
        setSummary(summary);
      }

    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock movements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'OPENING_STOCK':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'PURCHASES':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'SALES':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'CLOSING_STOCK':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'ADJUSTMENT':
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'OPENING_STOCK':
        return <Badge variant="outline" className="text-blue-700 border-blue-200">Opening Stock</Badge>;
      case 'PURCHASES':
        return <Badge className="bg-green-100 text-green-800">Purchases</Badge>;
      case 'SALES':
        return <Badge className="bg-red-100 text-red-800">Sales</Badge>;
      case 'CLOSING_STOCK':
        return <Badge className="bg-purple-100 text-purple-800">Closing Stock</Badge>;
      case 'ADJUSTMENT':
        return <Badge className="bg-orange-100 text-orange-800">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
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

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(quantity);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                No stock movements recorded for this period. Consider adding inventory data for proper COGS calculation.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-700">{formatCurrency(summary.total_opening)}</div>
                    <div className="text-sm text-blue-600">Opening Stock</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-700">{formatCurrency(summary.total_purchases)}</div>
                    <div className="text-sm text-green-600">Purchases</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-semibold text-purple-700">{formatCurrency(summary.total_closing)}</div>
                    <div className="text-sm text-purple-600">Closing Stock</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-700 flex items-center justify-center gap-1">
                      <Calculator className="h-4 w-4" />
                      {formatCurrency(summary.calculated_cogs)}
                    </div>
                    <div className="text-sm text-gray-600">Calculated COGS</div>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          {getMovementBadge(movement.movement_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.item_code}</div>
                          <div className="text-sm text-muted-foreground">{movement.item_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(movement.movement_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{formatQuantity(movement.quantity)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(movement.unit_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(movement.total_value)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movement.reference_document && (
                            <div className="font-medium">{movement.reference_document}</div>
                          )}
                          {movement.notes && (
                            <div className="text-muted-foreground">{movement.notes}</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};