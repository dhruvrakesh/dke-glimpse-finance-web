import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, FileSpreadsheet } from "lucide-react";

interface ReportExporterProps {
  reportType: 'balance-sheet' | 'ratio-analysis' | 'profit-loss';
  data?: any[];
  title: string;
}

export const ReportExporter: React.FC<ReportExporterProps> = ({ 
  reportType, 
  data = [], 
  title 
}) => {
  const { toast } = useToast();

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
          <tr>
            <td>Total Assets</td>
            <td>51,66,00,000</td>
            <td>46,20,00,000</td>
            <td>+11.8%</td>
          </tr>
          <tr>
            <td>Total Liabilities</td>
            <td>31,00,00,000</td>
            <td>28,50,00,000</td>
            <td>+8.8%</td>
          </tr>
          <tr>
            <td>Total Equity</td>
            <td>20,66,00,000</td>
            <td>17,70,00,000</td>
            <td>+16.7%</td>
          </tr>
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
          <tr>
            <td>Revenue</td>
            <td>15,00,00,000</td>
            <td>13,50,00,000</td>
            <td>+11.1%</td>
          </tr>
          <tr>
            <td>Cost of Goods Sold</td>
            <td>9,00,00,000</td>
            <td>8,10,00,000</td>
            <td>+11.1%</td>
          </tr>
          <tr>
            <td>Net Profit</td>
            <td>2,77,50,000</td>
            <td>2,30,00,000</td>
            <td>+20.7%</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const generateBalanceSheetCSV = () => {
    return `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n` +
           `"Total Assets","51,66,00,000","46,20,00,000","+11.8%"\n` +
           `"Total Liabilities","31,00,00,000","28,50,00,000","+8.8%"\n` +
           `"Total Equity","20,66,00,000","17,70,00,000","+16.7%"\n`;
  };

  const generateRatioAnalysisCSV = () => {
    return `"Ratio","Current Value","Target","Status"\n` +
           `"Current Ratio","2.4","2.0","Good"\n` +
           `"Debt to Equity","1.5","1.0","Needs Attention"\n` +
           `"Return on Assets","12.5%","10.0%","Excellent"\n`;
  };

  const generatePLCSV = () => {
    return `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n` +
           `"Revenue","15,00,00,000","13,50,00,000","+11.1%"\n` +
           `"Cost of Goods Sold","9,00,00,000","8,10,00,000","+11.1%"\n` +
           `"Net Profit","2,77,50,000","2,30,00,000","+20.7%"\n`;
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