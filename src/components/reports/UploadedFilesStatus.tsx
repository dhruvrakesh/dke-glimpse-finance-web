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
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  id: string;
  filename: string;
  processed_at?: string;
  created_at: string;
  status: 'processing' | 'completed' | 'failed';
  records_processed?: number;
  error_message?: string;
}

export const UploadedFilesStatus = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      // This would fetch from a file_uploads table if it existed
      // For now, we'll simulate based on trial balance entries
      const { data: entries, error } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .limit(10);

      if (error) throw error;

      // Since created_at is not available, create a single simulated upload
      const fileGroups: Record<string, UploadedFile> = {};
      if (entries && entries.length > 0) {
        const today = new Date().toDateString();
        fileGroups[today] = {
          id: today,
          filename: `trial_balance_${new Date().toISOString().split('T')[0]}.csv`,
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          status: 'completed',
          records_processed: entries.length
        };
      }

      setFiles(Object.values(fileGroups));
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Uploaded Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading file status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Uploaded Files ({files.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUploadedFiles}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload trial balance data to see processing status</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(file.status)}
                  <div>
                    <p className="font-medium text-sm">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.records_processed} records processed
                    </p>
                    {file.processed_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.processed_at).toLocaleDateString()} at{' '}
                        {new Date(file.processed_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(file.status)}
                  {file.status === 'completed' && (
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
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