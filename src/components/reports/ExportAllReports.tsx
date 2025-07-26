import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";

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
  const { 
    hasData, 
    periods, 
    getBalanceSheetData, 
    getPLData, 
    getTotalAssets, 
    getTotalLiabilities, 
    getTotalEquity,
    getTotalRevenue,
    getTotalExpenses 
  } = useFinancialData();
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
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Generate CSV content based on report type
    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    const currentPeriod = periods[0]; // Use latest period
    
    if (!hasData() || !currentPeriod) {
      csvContent = `"${reportName} - ${timestamp}"\n\n"No data available"\n`;
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }

    const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
    
    switch (reportType) {
      case 'balance-sheet':
        const balanceSheetData = getBalanceSheetData(currentPeriod.id);
        const totalAssets = getTotalAssets(currentPeriod.id);
        const totalLiabilities = getTotalLiabilities(currentPeriod.id);
        const totalEquity = getTotalEquity(currentPeriod.id);
        
        csvContent = `"Enhanced Balance Sheet - ${timestamp}"\n\n` +
                    `"Account","Current Amount (₹)","Previous Amount (₹)","Variance (%)"\n`;
        
        balanceSheetData.forEach(item => {
          csvContent += `"${item.account}","₹${formatAmount(item.current_amount)}","",""\n`;
        });
        
        csvContent += `"Total Assets","₹${formatAmount(totalAssets)}","",""\n`;
        csvContent += `"Total Liabilities","₹${formatAmount(totalLiabilities)}","",""\n`;
        csvContent += `"Total Equity","₹${formatAmount(totalEquity)}","",""\n`;
        break;
        
      case 'ratio-analysis':
        csvContent = `"Financial Ratio Analysis - ${timestamp}"\n\n` +
                    `"Ratio Category","Ratio Name","Current Value","Target","Industry Avg","Status"\n`;
        
        if (hasData()) {
          const assets = getTotalAssets(currentPeriod.id);
          const liabilities = getTotalLiabilities(currentPeriod.id);
          const revenue = getTotalRevenue(currentPeriod.id);
          const expenses = getTotalExpenses(currentPeriod.id);
          
          const currentRatio = assets > 0 ? (assets / liabilities).toFixed(2) : '0';
          const debtToEquity = getTotalEquity(currentPeriod.id) > 0 ? (liabilities / getTotalEquity(currentPeriod.id)).toFixed(2) : '0';
          const roa = assets > 0 ? ((revenue - expenses) / assets * 100).toFixed(1) : '0';
          
          csvContent += `"Liquidity","Current Ratio","${currentRatio}","2.0","2.1","${parseFloat(currentRatio) >= 2.0 ? 'Good' : 'Needs Attention'}"\n`;
          csvContent += `"Leverage","Debt to Equity","${debtToEquity}","1.0","1.2","${parseFloat(debtToEquity) <= 1.0 ? 'Good' : 'Needs Attention'}"\n`;
          csvContent += `"Profitability","Return on Assets","${roa}%","10.0%","8.5%","${parseFloat(roa) >= 10.0 ? 'Excellent' : 'Needs Improvement'}"\n`;
        } else {
          csvContent += `"","No data available","","","",""\n`;
        }
        break;
        
      case 'profit-loss':
        const plData = getPLData(currentPeriod.id);
        const totalRevenue = getTotalRevenue(currentPeriod.id);
        const totalExpenses = getTotalExpenses(currentPeriod.id);
        const netProfit = totalRevenue - totalExpenses;
        
        csvContent = `"Profit & Loss Statement - ${timestamp}"\n\n` +
                    `"Account","Current Period (₹)","Previous Period (₹)","Variance (%)"\n`;
        
        plData.forEach(item => {
          csvContent += `"${item.account}","₹${formatAmount(item.current_amount)}","",""\n`;
        });
        
        csvContent += `"Total Revenue","₹${formatAmount(totalRevenue)}","",""\n`;
        csvContent += `"Total Expenses","₹${formatAmount(totalExpenses)}","",""\n`;
        csvContent += `"Net Profit/Loss","₹${formatAmount(Math.abs(netProfit))}","",""\n`;
        break;
        
      case 'cash-flow':
        csvContent = `"Cash Flow Statement - ${timestamp}"\n\n` +
                    `"Activity","Amount (₹)","Previous Period (₹)","Variance (%)"\n` +
                    `"Cash flow data not available with current data structure","","",""\n`;
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
    if (!hasData()) {
      toast({
        title: "No Data Available",
        description: "Please upload trial balance data before exporting reports.",
        variant: "destructive",
      });
      return;
    }

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