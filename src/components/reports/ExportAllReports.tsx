import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, CheckCircle, XCircle } from "lucide-react";

interface ExportProgress {
  current: number;
  total: number;
  currentReport: string;
  status: 'idle' | 'exporting' | 'completed' | 'error';
}

interface ExportAllReportsProps {
  onExportComplete?: () => void;
}

export const ExportAllReports: React.FC<ExportAllReportsProps> = ({ onExportComplete }) => {
  const { toast } = useToast();
  const [progress, setProgress] = useState<ExportProgress>({
    current: 0,
    total: 4,
    currentReport: '',
    status: 'idle'
  });

  const reportTypes = [
    { id: 'balance-sheet', name: 'Enhanced Balance Sheet' },
    { id: 'ratio-analysis', name: 'Financial Ratio Analysis' },
    { id: 'profit-loss', name: 'Profit & Loss Statement' },
    { id: 'cash-flow', name: 'Cash Flow Statement' }
  ];

  const exportSingleReport = async (reportType: string, reportName: string): Promise<Blob> => {
    // Simulate report generation delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate CSV content based on report type
    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (reportType) {
      case 'balance-sheet':
        csvContent = `"Enhanced Balance Sheet - ${timestamp}"\n\n` +
                    `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n` +
                    `"Current Assets","25,83,00,000","23,10,00,000","+11.8%"\n` +
                    `"Non-Current Assets","25,83,00,000","23,10,00,000","+11.8%"\n` +
                    `"Total Assets","51,66,00,000","46,20,00,000","+11.8%"\n` +
                    `"Current Liabilities","15,50,00,000","14,25,00,000","+8.8%"\n` +
                    `"Non-Current Liabilities","15,50,00,000","14,25,00,000","+8.8%"\n` +
                    `"Total Liabilities","31,00,00,000","28,50,00,000","+8.8%"\n` +
                    `"Share Capital","10,33,00,000","8,85,00,000","+16.7%"\n` +
                    `"Retained Earnings","10,33,00,000","8,85,00,000","+16.7%"\n` +
                    `"Total Equity","20,66,00,000","17,70,00,000","+16.7%"\n`;
        break;
      case 'ratio-analysis':
        csvContent = `"Financial Ratio Analysis - ${timestamp}"\n\n` +
                    `"Ratio Category","Ratio Name","Current Value","Target","Industry Avg","Status"\n` +
                    `"Liquidity","Current Ratio","2.4","2.0","2.1","Good"\n` +
                    `"Liquidity","Quick Ratio","1.8","1.5","1.6","Excellent"\n` +
                    `"Leverage","Debt to Equity","1.5","1.0","1.2","Needs Attention"\n` +
                    `"Profitability","Return on Assets","12.5%","10.0%","8.5%","Excellent"\n` +
                    `"Profitability","Net Profit Margin","18.5%","15.0%","12.0%","Excellent"\n` +
                    `"Efficiency","Asset Turnover","0.67","0.80","0.75","Needs Improvement"\n`;
        break;
      case 'profit-loss':
        csvContent = `"Profit & Loss Statement - ${timestamp}"\n\n` +
                    `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n` +
                    `"Revenue","15,00,00,000","13,50,00,000","+11.1%"\n` +
                    `"Cost of Goods Sold","9,00,00,000","8,10,00,000","+11.1%"\n` +
                    `"Gross Profit","6,00,00,000","5,40,00,000","+11.1%"\n` +
                    `"Operating Expenses","3,22,50,000","3,10,00,000","+4.0%"\n` +
                    `"EBITDA","2,77,50,000","2,30,00,000","+20.7%"\n` +
                    `"Net Profit","2,77,50,000","2,30,00,000","+20.7%"\n`;
        break;
      case 'cash-flow':
        csvContent = `"Cash Flow Statement - ${timestamp}"\n\n` +
                    `"Activity","Amount (₹)","Previous Period (₹)","Variance (%)"\n` +
                    `"Operating Cash Flow","3,50,00,000","2,80,00,000","+25.0%"\n` +
                    `"Investing Cash Flow","-1,20,00,000","-90,00,000","+33.3%"\n` +
                    `"Financing Cash Flow","-50,00,000","-70,00,000","-28.6%"\n` +
                    `"Net Cash Flow","1,80,00,000","1,20,00,000","+50.0%"\n`;
        break;
      default:
        csvContent = `"Report Data - ${timestamp}"\n\n"No data available"\n`;
    }
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };

  const createZipFile = async (files: { name: string; blob: Blob }[]): Promise<Blob> => {
    // For now, we'll create a simple text file with all reports
    // In a real implementation, you'd use a library like JSZip
    let combinedContent = `Enterprise Financial Reports - Exported on ${new Date().toLocaleString()}\n\n`;
    
    for (const file of files) {
      combinedContent += `\n${'='.repeat(50)}\n`;
      combinedContent += `${file.name}\n`;
      combinedContent += `${'='.repeat(50)}\n`;
      combinedContent += await file.blob.text();
      combinedContent += '\n\n';
    }
    
    return new Blob([combinedContent], { type: 'text/plain;charset=utf-8;' });
  };

  const exportAllReports = async () => {
    setProgress({ current: 0, total: reportTypes.length, currentReport: '', status: 'exporting' });
    
    try {
      const exportedFiles: { name: string; blob: Blob }[] = [];
      
      for (let i = 0; i < reportTypes.length; i++) {
        const report = reportTypes[i];
        setProgress(prev => ({ 
          ...prev, 
          current: i + 1, 
          currentReport: report.name 
        }));
        
        const blob = await exportSingleReport(report.id, report.name);
        exportedFiles.push({
          name: `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
          blob
        });
      }
      
      // Create combined file
      const zipBlob = await createZipFile(exportedFiles);
      
      // Download the file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `All_Financial_Reports_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setProgress(prev => ({ ...prev, status: 'completed' }));
      
      toast({
        title: "Export Successful",
        description: "All financial reports have been exported successfully.",
      });
      
      onExportComplete?.();
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setProgress({ current: 0, total: 4, currentReport: '', status: 'idle' });
      }, 3000);
      
    } catch (error) {
      setProgress(prev => ({ ...prev, status: 'error' }));
      
      toast({
        title: "Export Failed",
        description: "Failed to export reports. Please try again.",
        variant: "destructive",
      });
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setProgress({ current: 0, total: 4, currentReport: '', status: 'idle' });
      }, 3000);
    }
  };

  const getButtonContent = () => {
    switch (progress.status) {
      case 'exporting':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exporting...
          </>
        );
      case 'completed':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="h-4 w-4 mr-2" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </>
        );
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        size="sm" 
        onClick={exportAllReports}
        disabled={progress.status === 'exporting'}
        variant={progress.status === 'completed' ? 'default' : progress.status === 'error' ? 'destructive' : 'default'}
      >
        {getButtonContent()}
      </Button>
      
      {progress.status === 'exporting' && (
        <div className="space-y-2 min-w-[200px]">
          <Progress value={(progress.current / progress.total) * 100} className="w-full" />
          <p className="text-xs text-muted-foreground">
            Exporting {progress.currentReport} ({progress.current}/{progress.total})
          </p>
        </div>
      )}
    </div>
  );
};