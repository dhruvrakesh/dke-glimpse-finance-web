
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TemplateDownloadSectionProps {
  title: string;
  description: string;
  onDownload: () => void;
  fields: Array<{
    name: string;
    description: string;
    example?: string;
  }>;
}

export const TemplateDownloadSection: React.FC<TemplateDownloadSectionProps> = ({
  title,
  description,
  onDownload,
  fields
}) => {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-3 w-3" />
            Download Template
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            Expected CSV Format:
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {fields.map((field, index) => (
              <div key={index} className="flex justify-between items-center bg-background/50 rounded px-2 py-1">
                <span className="font-mono text-primary">{field.name}</span>
                <span className="text-muted-foreground">{field.description}</span>
                {field.example && (
                  <span className="text-xs italic text-muted-foreground/70">
                    e.g., {field.example}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
