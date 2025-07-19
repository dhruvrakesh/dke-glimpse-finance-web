
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BalanceSheetItem {
  schedule3_item: string;
  report_section: string;
  report_sub_section: string;
  amount: number;
}

interface BalanceSheetDisplayProps {
  data: BalanceSheetItem[];
}

export const BalanceSheetDisplay: React.FC<BalanceSheetDisplayProps> = ({ data }) => {
  // Separate assets and liabilities
  const assets = data.filter(item => 
    item.report_section.includes('Assets') || 
    item.report_section.includes('Asset')
  );
  
  const liabilities = data.filter(item => 
    item.report_section.includes('Liabilities') || 
    item.report_section.includes('Equity') ||
    item.report_section.includes('Liability')
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = (items: BalanceSheetItem[]) => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const renderSection = (items: BalanceSheetItem[], title: string) => (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.schedule3_item}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatAmount(item.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-bold">
              <TableCell>Total {title}</TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(calculateTotal(items))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No balance sheet data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Balance Sheet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderSection(assets, "ASSETS")}
        {renderSection(liabilities, "EQUITY AND LIABILITIES")}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Total Assets: {formatAmount(calculateTotal(assets))} | 
        Total Equity & Liabilities: {formatAmount(calculateTotal(liabilities))}
      </div>
    </div>
  );
};
