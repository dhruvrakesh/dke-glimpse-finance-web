import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { TemplateDownloadSection } from '@/components/ui/TemplateDownloadSection';
import { Upload as UploadIcon, FileText } from 'lucide-react';
import { downloadTrialBalanceTemplate } from '@/utils/csvTemplates';

export const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quarterEndDate, setQuarterEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!quarterEndDate) {
      toast({
        title: "No Date Selected",
        description: "Please select the quarter end date.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload file to Supabase Storage
      const fileName = `trial_balance_${new Date().toISOString()}.csv`;
      const filePath = `public/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('financial_uploads')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('financial_uploads')
        .getPublicUrl(filePath);

      // Create form data for the edge function
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('periodId', quarterEndDate.toISOString());

      // Call edge function to process the trial balance
      const { data: processData, error: processError } = await supabase.functions
        .invoke('process-trial-balance', {
          body: formData,
        });

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      toast({
        title: "Success!",
        description: "File processed successfully!",
      });

      // Reset form
      setSelectedFile(null);
      setQuarterEndDate(undefined);
      
      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Upload/Processing error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const trialBalanceFields = [
    {
      name: "ledger_name",
      description: "Name of the ledger account",
      example: "Cash in Hand, Bank Account, Sales"
    },
    {
      name: "closing_balance",
      description: "Closing balance amount (negative for credits)",
      example: "150000, -50000"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Trial Balance</h1>
        <p className="text-muted-foreground mt-2">
          Upload your trial balance CSV file for processing and analysis
        </p>
      </div>

      {/* Template Download Section */}
      <TemplateDownloadSection
        title="Download Sample Template"
        description="Download a sample CSV template to understand the expected data format"
        onDownload={downloadTrialBalanceTemplate}
        fields={trialBalanceFields}
      />

      <Card className="shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Trial Balance</CardTitle>
          <CardDescription>
            Select a CSV file containing your trial balance data and specify the quarter end date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Zone */}
            <div className="space-y-2">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Trial Balance File (CSV)
              </label>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center space-y-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <UploadIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum file size: 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quarter End Date</label>
              <DatePicker
                date={quarterEndDate}
                setDate={setQuarterEndDate}
                placeholder="Select quarter end date"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !selectedFile || !quarterEndDate}
            >
              {isLoading ? "Processing..." : "Upload and Process"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
