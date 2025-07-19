
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProfitLossItem {
  schedule3_item: string;
  report_section: string;
  report_sub_section: string;
  amount: number;
  is_credit_positive: boolean;
}

interface ProfitAndLossDisplayProps {
  data: ProfitLossItem[];
}

export const ProfitAndLossDisplay: React.FC<ProfitAndLossDisplayProps> = ({ data }) => {
  const revenue = data.filter(item => 
    item.report_section.includes('Revenue') || 
    item.report_section.includes('Income')
  );
  
  const expenses = data.filter(item => 
    item.report_section.includes('Expenses') || 
    item.report_section.includes('Cost')
  );

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

  const totalRevenue = calculateTotal(revenue);
  const totalExpenses = calculateTotal(expenses);
  const netProfit = totalRevenue - totalExpenses;

  const renderSection = (items: ProfitLossItem[], title: string) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg border-b pb-2">{title}</h3>
      <Table>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.schedule3_item}</TableCell>
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
