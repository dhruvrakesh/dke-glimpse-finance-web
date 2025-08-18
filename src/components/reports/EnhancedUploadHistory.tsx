import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Eye
} from "lucide-react";

interface UploadRecord {
  id: string;
  filename: string;
  file_size_bytes: number;
  upload_status: string;
  entries_count: number;
  gpt_confidence_score: number;
  processing_metadata?: any;
  created_at: string;
  processed_at?: string;
  period_id: number;
  detected_period?: string;
  period_confidence?: number;
  processed_entries_count?: number;
  failed_entries_count?: number;
  period?: {
    quarter: number;
    year: number;
  };
}

interface TrialBalanceEntry {
  ledger_name: string;
  debit: number;
  credit: number;
  closing_balance: number;
  account_type: string;
  account_category: string;
  gpt_confidence: number;
}

export const EnhancedUploadHistory = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('trial_balance_uploads')
        .select('id, filename, file_size_bytes, upload_status, entries_count, gpt_confidence_score, created_at, processed_at, period_id, error_message, detected_period, period_confidence, processed_entries_count, failed_entries_count')
        .order('created_at', { ascending: false });

      const { data: periods } = await (supabase as any)
        .from('financial_periods')
        .select('id, quarter, year');

      if (error) throw error;

      // Transform data to match interface
      const transformedData: UploadRecord[] = (data || []).map((upload: any) => {
        const period = periods?.find(p => p.id === upload.period_id);
        return {
          id: upload.id,
          filename: upload.filename,
          file_size_bytes: upload.file_size_bytes,
          upload_status: upload.upload_status,
          entries_count: upload.entries_count,
          gpt_confidence_score: upload.gpt_confidence_score,
          processing_metadata: upload.error_message ? { error_message: upload.error_message } : undefined,
          created_at: upload.created_at,
          processed_at: upload.processed_at,
          period_id: upload.period_id,
          detected_period: upload.detected_period,
          period_confidence: upload.period_confidence,
          processed_entries_count: upload.processed_entries_count,
          failed_entries_count: upload.failed_entries_count,
          period: period ? { quarter: period.quarter, year: period.year } : undefined
        };
      });

      setUploads(transformedData);
    } catch (error) {
      console.error('Error fetching upload history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upload history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    if (percentage >= 90) {
      return <Badge variant="default" className="bg-green-100 text-green-800">{percentage}%</Badge>;
    } else if (percentage >= 70) {
      return <Badge variant="secondary">{percentage}%</Badge>;
    } else {
      return <Badge variant="outline">{percentage}%</Badge>;
    }
  };

  const downloadProcessedData = async (uploadId: string, filename: string) => {
    try {
      // Simple query to avoid TypeScript recursion
      const { data: entries, error } = await (supabase as any)
        .from('trial_balance_entries')
        .select('ledger_name, debit, credit, closing_balance, account_type, account_category, gpt_confidence')
        .eq('upload_id', uploadId);

      if (error) throw error;

      if (!entries || entries.length === 0) {
        toast({
          title: "No Data",
          description: "No processed data found for this upload",
        });
        return;
      }

      const headers = ['Account Name', 'Debit', 'Credit', 'Closing Balance', 'Account Type', 'Category', 'Confidence'];
      const csvContent = [
        headers.join(','),
        ...entries.map((entry) => [
          `"${entry.ledger_name}"`,
          entry.debit,
          entry.credit,
          entry.closing_balance,
          entry.account_type,
          entry.account_category,
          (entry.gpt_confidence * 100).toFixed(1) + '%'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed_${filename.replace(/\.[^/.]+$/, "")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: "Error",
        description: "Failed to download processed data",
        variant: "destructive",
      });
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      // Delete the upload record (cascade should handle entries)
      const { error } = await (supabase as any)
        .from('trial_balance_uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      // Refresh the list
      await fetchUploadHistory();

      toast({
        title: "Success",
        description: "Upload deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: "Error",
        description: "Failed to delete upload",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading upload history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload History
        </CardTitle>
        <Button 
          onClick={fetchUploadHistory} 
          size="sm" 
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.upload_status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{upload.filename}</p>
                      {upload.period && (
                        <Badge variant="outline">
                          Q{upload.period.quarter} {upload.period.year}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{(upload.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>{upload.processed_entries_count || upload.entries_count} entries</span>
                      {upload.gpt_confidence_score && (
                        <span>Confidence: {getConfidenceBadge(upload.gpt_confidence_score)}</span>
                      )}
                      {upload.detected_period && (
                        <span>• {upload.detected_period}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Uploaded: {new Date(upload.created_at).toLocaleDateString()} at{' '}
                        {new Date(upload.created_at).toLocaleTimeString()}
                      </span>
                      {upload.processed_at && (
                        <span className="text-xs text-muted-foreground">
                          • Processed: {new Date(upload.processed_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(upload.upload_status)}
                  
                  {upload.upload_status === 'completed' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Navigate to trial balance viewer filtered by this upload
                          window.location.href = `/trial-balance-viewer?upload_id=${upload.id}`;
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadProcessedData(upload.id, upload.filename)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteUpload(upload.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};