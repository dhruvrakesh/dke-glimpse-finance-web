
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProfitLossItem {
  master_item_id: number;
  amount: number;
  period_id: number;
}

interface ProfitAndLossDisplayProps {
  data: ProfitLossItem[];
}

export const ProfitAndLossDisplay: React.FC<ProfitAndLossDisplayProps> = ({ data }) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = (items: ProfitLossItem[]) => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const renderSection = (items: ProfitLossItem[], title: string) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg border-b pb-2">{title}</h3>
      <Table>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>Item {item.master_item_id}</TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(item.amount)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t font-semibold">
            <TableCell>Total {title}</TableCell>
            <TableCell className="text-right font-mono">
              {formatAmount(calculateTotal(items))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No profit & loss data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  // For demonstration, split data arbitrarily
  const revenue = data.slice(0, Math.ceil(data.length / 2));
  const expenses = data.slice(Math.ceil(data.length / 2));

  const totalRevenue = calculateTotal(revenue);
  const totalExpenses = calculateTotal(expenses);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Profit & Loss Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(revenue, "REVENUE")}
        {renderSection(expenses, "EXPENSES")}
        
        <div className="border-t-2 pt-4">
          <Table>
            <TableBody>
              <TableRow className="text-lg font-bold">
                <TableCell>Net Profit/(Loss)</TableCell>
                <TableCell className={`text-right font-mono ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
