import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Trash2,
  Download,
  RefreshCw,
  Eye,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadRecord {
  id: string;
  filename: string;
  file_size_mb: number;
  processing_status: string;
  processed_entries_count: number;
  confidence_score: number;
  processing_metadata: any;
  uploaded_at: string;
  processed_at?: string;
  period_id: number;
  period?: {
    quarter: number;
    year: number;
  };
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
      const { data, error } = await supabase
        .from('trial_balance_uploads')
        .select(`
          *,
          financial_periods!period_id (
            quarter,
            year
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
      toast({
        title: "Error",
        description: "Failed to load upload history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConfidenceBadge = (score: number) => {
    const percentage = Math.round(score * 100);
    const variant = score >= 0.8 ? "default" : score >= 0.6 ? "secondary" : "destructive";
    return <Badge variant={variant}>{percentage}%</Badge>;
  };

  const downloadProcessedData = async (uploadId: string, filename: string) => {
    try {
      const { data, error } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .eq('upload_id', uploadId);

      if (error) throw error;

      const headers = ['Account Name', 'Debit', 'Credit', 'Closing Balance', 'Account Type', 'Category', 'Confidence'];
      const csvContent = [
        headers.join(','),
        ...(data || []).map((entry: any) => [
          `"${entry.ledger_name}"`,
          entry.debit,
          entry.credit,
          entry.closing_balance,
          entry.account_type,
          entry.account_category,
          entry.confidence_score ? (entry.confidence_score * 100).toFixed(0) + '%' : ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${filename.replace(/\.[^/.]+$/, "")}.csv`;
      a.click();
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
        variant: "destructive"
      });
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      // First delete related trial balance entries
      await supabase
        .from('trial_balance_entries')
        .delete()
        .eq('upload_id', uploadId);

      // Then delete the upload record
      const { error } = await supabase
        .from('trial_balance_uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Upload deleted successfully",
      });
      
      fetchUploadHistory();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: "Error",
        description: "Failed to delete upload",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading upload history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload History ({uploads.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUploadHistory}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No uploads found</p>
            <p className="text-sm">Upload trial balance data to see processing history</p>
          </div>
        ) : (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div 
                key={upload.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(upload.processing_status)}
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
                      <span>{upload.file_size_mb.toFixed(1)} MB</span>
                      <span>{upload.processed_entries_count} entries</span>
                      {upload.confidence_score && (
                        <span>Confidence: {getConfidenceBadge(upload.confidence_score)}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Uploaded: {new Date(upload.uploaded_at).toLocaleDateString()} at{' '}
                        {new Date(upload.uploaded_at).toLocaleTimeString()}
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
                  {getStatusBadge(upload.processing_status)}
                  
                  {upload.processing_status === 'completed' && (
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.location.href = '/trial-balance-viewer'}
                        title="View Data"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => downloadProcessedData(upload.id, upload.filename)}
                        title="Download Processed Data"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteUpload(upload.id)}
                        title="Delete Upload"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};