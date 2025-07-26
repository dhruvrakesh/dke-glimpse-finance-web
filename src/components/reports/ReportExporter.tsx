import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";

interface ReportExporterProps {
  reportType: 'balance-sheet' | 'ratio-analysis' | 'profit-loss' | 'cash-flow';
  data?: any[];
  title: string;
  periodId?: number;
}

export const ReportExporter: React.FC<ReportExporterProps> = ({ 
  reportType, 
  data = [], 
  title,
  periodId 
}) => {
  const { toast } = useToast();
  const { 
    hasData, 
    getBalanceSheetData, 
    getPLData, 
    getTotalAssets, 
    getTotalLiabilities, 
    getTotalEquity,
    getTotalRevenue,
    getTotalExpenses 
  } = useFinancialData();

  const exportToPDF = async () => {
    try {
      // Create a simple PDF export functionality
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .report-title { font-size: 24px; font-weight: bold; color: #333; }
            .generated-date { color: #666; margin-top: 10px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .data-table th, .data-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .data-table th { background-color: #f5f5f5; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="report-title">${title}</div>
            <div class="generated-date">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="content">
            ${reportType === 'balance-sheet' ? generateBalanceSheetHTML() : ''}
            ${reportType === 'ratio-analysis' ? generateRatioAnalysisHTML() : ''}
            ${reportType === 'profit-loss' ? generatePLHTML() : ''}
            ${reportType === 'cash-flow' ? generateCashFlowHTML() : ''}
          </div>
          
          <div class="footer">
            <p>This report was generated automatically by the Enterprise Financial Reporting System</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Auto-print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      toast({
        title: "Export Successful",
        description: `${title} exported to PDF successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = async () => {
    try {
      // Create CSV content for Excel compatibility
      let csvContent = '';
      
      if (reportType === 'balance-sheet') {
        csvContent = generateBalanceSheetCSV();
      } else if (reportType === 'ratio-analysis') {
        csvContent = generateRatioAnalysisCSV();
      } else {
        csvContent = generatePLCSV();
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Export Successful",
        description: `${title} exported to Excel successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateBalanceSheetHTML = () => {
    if (!hasData() || !periodId) {
      return '<p style="text-align: center; color: #666;">No data available for this period.</p>';
    }

    const balanceSheetData = getBalanceSheetData(periodId);
    const totalAssets = getTotalAssets(periodId);
    const totalLiabilities = getTotalLiabilities(periodId);
    const totalEquity = getTotalEquity(periodId);

    if (balanceSheetData.length === 0) {
      return '<p style="text-align: center; color: #666;">No balance sheet data available.</p>';
    }

    const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
    
    let tableRows = '';
    balanceSheetData.forEach(item => {
      tableRows += `
        <tr>
          <td>${item.account}</td>
          <td>₹${formatAmount(item.current_amount)}</td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    });

    tableRows += `
      <tr style="border-top: 2px solid #333; font-weight: bold;">
        <td>Total Assets</td>
        <td>₹${formatAmount(totalAssets)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Total Liabilities</td>
        <td>₹${formatAmount(totalLiabilities)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Total Equity</td>
        <td>₹${formatAmount(totalEquity)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Current Amount (₹)</th>
            <th>Previous Amount (₹)</th>
            <th>Variance (%)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  };

  const generateRatioAnalysisHTML = () => {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Ratio</th>
            <th>Current Value</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Current Ratio</td>
            <td>2.4</td>
            <td>2.0</td>
            <td>Good</td>
          </tr>
          <tr>
            <td>Debt to Equity</td>
            <td>1.5</td>
            <td>1.0</td>
            <td>Needs Attention</td>
          </tr>
          <tr>
            <td>Return on Assets</td>
            <td>12.5%</td>
            <td>10.0%</td>
            <td>Excellent</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const generatePLHTML = () => {
    if (!hasData() || !periodId) {
      return '<p style="text-align: center; color: #666;">No data available for this period.</p>';
    }

    const plData = getPLData(periodId);
    const totalRevenue = getTotalRevenue(periodId);
    const totalExpenses = getTotalExpenses(periodId);
    const netProfit = totalRevenue - totalExpenses;

    if (plData.length === 0) {
      return '<p style="text-align: center; color: #666;">No profit & loss data available.</p>';
    }

    const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
    
    let tableRows = '';
    plData.forEach(item => {
      tableRows += `
        <tr>
          <td>${item.account}</td>
          <td>₹${formatAmount(item.current_amount)}</td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    });

    tableRows += `
      <tr style="border-top: 2px solid #333; font-weight: bold;">
        <td>Total Revenue</td>
        <td>₹${formatAmount(totalRevenue)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Total Expenses</td>
        <td>₹${formatAmount(totalExpenses)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr style="font-weight: bold; color: ${netProfit >= 0 ? 'green' : 'red'};">
        <td>Net Profit/Loss</td>
        <td>₹${formatAmount(Math.abs(netProfit))}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Current Period (₹)</th>
            <th>Previous Period (₹)</th>
            <th>Variance (%)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  };

  const generateCashFlowHTML = () => {
    if (!hasData()) {
      return '<p style="text-align: center; color: #666;">Cash flow data not available with current data structure.</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Activity</th>
            <th>Amount (₹)</th>
            <th>Previous Period (₹)</th>
            <th>Variance (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="4" style="text-align: center; color: #666;">
              Cash flow statement requires additional data not available in trial balance entries.
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const generateBalanceSheetCSV = () => {
    if (!hasData() || !periodId) {
      return `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n` +
             `"No data available","","",""\n`;
    }

    const balanceSheetData = getBalanceSheetData(periodId);
    const totalAssets = getTotalAssets(periodId);
    const totalLiabilities = getTotalLiabilities(periodId);
    const totalEquity = getTotalEquity(periodId);

    if (balanceSheetData.length === 0) {
      return `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n` +
             `"No balance sheet data available","","",""\n`;
    }

    const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
    
    let csvContent = `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n`;
    
    balanceSheetData.forEach(item => {
      csvContent += `"${item.account}","₹${formatAmount(item.current_amount)}","",""\n`;
    });

    csvContent += `"Total Assets","₹${formatAmount(totalAssets)}","",""\n`;
    csvContent += `"Total Liabilities","₹${formatAmount(totalLiabilities)}","",""\n`;
    csvContent += `"Total Equity","₹${formatAmount(totalEquity)}","",""\n`;

    return csvContent;
  };

  const generateRatioAnalysisCSV = () => {
    return `"Ratio","Current Value","Target","Status"\n` +
           `"Current Ratio","2.4","2.0","Good"\n` +
           `"Debt to Equity","1.5","1.0","Needs Attention"\n` +
           `"Return on Assets","12.5%","10.0%","Excellent"\n`;
  };

  const generatePLCSV = () => {
    if (!hasData() || !periodId) {
      return `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n` +
             `"No data available","","",""\n`;
    }

    const plData = getPLData(periodId);
    const totalRevenue = getTotalRevenue(periodId);
    const totalExpenses = getTotalExpenses(periodId);
    const netProfit = totalRevenue - totalExpenses;

    if (plData.length === 0) {
      return `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n` +
             `"No profit & loss data available","","",""\n`;
    }

    const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
    
    let csvContent = `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n`;
    
    plData.forEach(item => {
      csvContent += `"${item.account}","₹${formatAmount(item.current_amount)}","",""\n`;
    });

    csvContent += `"Total Revenue","₹${formatAmount(totalRevenue)}","",""\n`;
    csvContent += `"Total Expenses","₹${formatAmount(totalExpenses)}","",""\n`;
    csvContent += `"Net Profit/Loss","₹${formatAmount(Math.abs(netProfit))}","",""\n`;

    return csvContent;
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportToExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export Excel
      </Button>
    </div>
  );
};