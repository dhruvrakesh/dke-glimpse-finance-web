import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { TemplateDownloadSection } from '@/components/ui/TemplateDownloadSection';
import { Upload as UploadIcon, FileText, Brain } from 'lucide-react';
import { downloadTrialBalanceTemplate } from '@/utils/csvTemplates';

export const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quarterEndDate, setQuarterEndDate] = useState<Date | undefined>(undefined);
  const [useAiPeriodDetection, setUseAiPeriodDetection] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - now accepting images
      const fileName = file.name.toLowerCase();
      const validImageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const isValidType = validImageTypes.some(type => fileName.endsWith(type));
      
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (.jpg, .jpeg, .png, .webp, .pdf).",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 20MB for images)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 20MB.",
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
      const fileName = file.name.toLowerCase();
      const validImageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const isValidType = validImageTypes.some(type => fileName.endsWith(type));
      
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (.jpg, .jpeg, .png, .webp, .pdf).",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 20MB.",
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
        description: "Please select a trial balance image to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!useAiPeriodDetection && !quarterEndDate) {
      toast({
        title: "No Date Selected",
        description: "Please select the quarter end date or enable AI period detection.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create form data for the GPT-enhanced edge function
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Only include quarterEndDate if AI detection is disabled
      if (!useAiPeriodDetection && quarterEndDate) {
        formData.append('quarterEndDate', quarterEndDate.toISOString());
      } else {
        // Use a default fallback date for period creation if needed
        formData.append('quarterEndDate', new Date().toISOString());
      }

      toast({
        title: "Processing...",
        description: useAiPeriodDetection 
          ? "AI is analyzing the image and detecting the financial period automatically..."
          : "Analyzing trial balance image with AI Vision - this may take a moment",
      });

      // Call GPT-enhanced edge function to process the trial balance
      const { data: processData, error: processError } = await supabase.functions
        .invoke('analyze-trial-balance-with-gpt', {
          body: formData,
        });

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      if (!processData?.success) {
        throw new Error(processData?.error || 'Processing failed');
      }

      const confidence = processData.details?.gpt_confidence 
        ? Math.round(processData.details.gpt_confidence * 100) 
        : 'Unknown';

      toast({
        title: "Success!",
        description: `${processData.message} (AI Confidence: ${confidence}%)`,
      });

      // Reset form
      setSelectedFile(null);
      setQuarterEndDate(undefined);
      
      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Upload/Processing error:', error);
      toast({
        title: "Processing Failed",
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
          Upload a screenshot or image of your trial balance for AI-powered processing and analysis
        </p>
      </div>

      {/* Guidelines Section */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">📸 Screenshot Guidelines</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Capture clear screenshots of your trial balance from any software</li>
            <li>• Ensure account names and amounts are clearly visible</li>
            <li>• Include column headers (Particulars, Debit, Credit, etc.)</li>
            <li>• For large trial balances, you can split into multiple images</li>
            <li>• Supported formats: JPG, PNG, PDF, WebP</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Trial Balance Image</CardTitle>
        <CardDescription>
          Upload a screenshot or image of your trial balance and specify the quarter end date
        </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Zone */}
            <div className="space-y-2">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Trial Balance Image
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
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center space-y-3">
                    {selectedFile.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Trial balance preview" 
                        className="max-h-40 max-w-full object-contain rounded border"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-primary" />
                    )}
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <UploadIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drag and drop your trial balance image here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: .jpg, .jpeg, .png, .webp, .pdf • Maximum file size: 20MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Period Detection Toggle */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Brain className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ai-period-detection"
                      checked={useAiPeriodDetection}
                      onChange={(e) => setUseAiPeriodDetection(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="ai-period-detection" className="text-sm font-medium">
                      Intelligent Period Detection
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will automatically detect the financial period from your trial balance image
                  </p>
                </div>
              </div>

              {/* Manual Date Picker - only shown when AI detection is disabled */}
              {!useAiPeriodDetection && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quarter End Date</label>
                  <DatePicker
                    date={quarterEndDate}
                    setDate={setQuarterEndDate}
                    placeholder="Select quarter end date"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !selectedFile || (!useAiPeriodDetection && !quarterEndDate)}
            >
              {isLoading ? "Processing..." : useAiPeriodDetection ? "Upload and Auto-Analyze" : "Upload and Process"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
