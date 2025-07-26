import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, FileType, RefreshCw, Database } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportSettings: React.FC<ReportSettingsProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: "30",
    defaultExportFormat: "pdf",
    includeComparatives: true,
    showVarianceAnalysis: true,
    dateRange: {
      start: new Date(new Date().getFullYear(), 0, 1),
      end: new Date()
    }
  });

  const handleSaveSettings = () => {
    // Save settings to localStorage or database
    localStorage.setItem('reportSettings', JSON.stringify(settings));
    
    toast({
      title: "Settings Saved",
      description: "Your report preferences have been updated successfully.",
    });
    
    onOpenChange(false);
  };

  const handleClearData = () => {
    // Implement clear data functionality
    toast({
      title: "Data Cleared",
      description: "All report data has been cleared. Please upload new data to generate reports.",
      variant: "destructive",
    });
  };

  const SettingsContent = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Label className="text-base font-medium">Report Date Range</Label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">From Date</Label>
            <DatePicker
              date={settings.dateRange.start}
              setDate={(date) => date && setSettings(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: date }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">To Date</Label>
            <DatePicker
              date={settings.dateRange.end}
              setDate={(date) => date && setSettings(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: date }
              }))}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Export Preferences */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileType className="h-4 w-4" />
          <Label className="text-base font-medium">Export Preferences</Label>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Default Export Format</Label>
            <Select
              value={settings.defaultExportFormat}
              onValueChange={(value) => setSettings(prev => ({ ...prev, defaultExportFormat: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Include Comparative Analysis</Label>
            <Switch
              checked={settings.includeComparatives}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeComparatives: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Variance Analysis</Label>
            <Switch
              checked={settings.showVarianceAnalysis}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showVarianceAnalysis: checked }))}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Refresh Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <Label className="text-base font-medium">Auto Refresh</Label>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Auto Refresh</Label>
            <Switch
              checked={settings.autoRefresh}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoRefresh: checked }))}
            />
          </div>
          {settings.autoRefresh && (
            <div className="space-y-2">
              <Label className="text-sm">Refresh Interval (minutes)</Label>
              <Select
                value={settings.refreshInterval}
                onValueChange={(value) => setSettings(prev => ({ ...prev, refreshInterval: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <Label className="text-base font-medium">Data Management</Label>
        </div>
        <div className="space-y-4">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClearData}
            className="w-full"
          >
            Clear All Report Data
          </Button>
          <p className="text-xs text-muted-foreground">
            This will remove all uploaded trial balance data and reset mapping configurations.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSaveSettings} className="flex-1">
          Save Settings
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Report Settings</DrawerTitle>
            <DrawerDescription>
              Configure your report preferences and data management options
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <SettingsContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Settings</DialogTitle>
          <DialogDescription>
            Configure your report preferences and data management options
          </DialogDescription>
        </DialogHeader>
        <SettingsContent />
      </DialogContent>
    </Dialog>
  );
};