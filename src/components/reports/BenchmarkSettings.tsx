import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Upload, Download } from "lucide-react";

interface RatioDefinition {
  id: string;
  ratio_name: string;
  ratio_category: string;
  formula_description: string;
  industry_average: number;
  target_value: number;
  benchmark_value: number;
  display_order: number;
  is_active: boolean;
}

interface UserBenchmark {
  id?: string;
  ratio_definition_id: string;
  custom_industry_average: number | null;
  custom_target_value: number | null;
  benchmark_source: string;
  notes: string | null;
  is_active: boolean;
}

export function BenchmarkSettings() {
  const [ratioDefinitions, setRatioDefinitions] = useState<RatioDefinition[]>([]);
  const [userBenchmarks, setUserBenchmarks] = useState<UserBenchmark[]>([]);
  const [editingBenchmarks, setEditingBenchmarks] = useState<Record<string, UserBenchmark>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const benchmarkSources = [
    'Custom',
    'Industry Association',
    'Internal Historical',
    'External Research',
    'Regulatory'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch ratio definitions
      const { data: ratios, error: ratiosError } = await supabase
        .from('ratio_definitions')
        .select('*')
        .order('ratio_category', { ascending: true });

      if (ratiosError) throw ratiosError;

      // Fetch user benchmarks
      const { data: benchmarks, error: benchmarksError } = await supabase
        .from('user_ratio_benchmarks')
        .select('*')
        .eq('is_active', true);

      if (benchmarksError) throw benchmarksError;

      setRatioDefinitions(ratios || []);
      setUserBenchmarks(benchmarks || []);

      // Initialize editing state
      const initialEditing: Record<string, UserBenchmark> = {};
      ratios?.forEach(ratio => {
        const existingBenchmark = benchmarks?.find(b => b.ratio_definition_id === ratio.id);
        initialEditing[ratio.id] = existingBenchmark || {
          ratio_definition_id: ratio.id,
          custom_industry_average: null,
          custom_target_value: null,
          benchmark_source: 'Custom',
          notes: null,
          is_active: true
        };
      });
      setEditingBenchmarks(initialEditing);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load benchmark data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBenchmark = async (ratioDefinitionId: string) => {
    try {
      setSaving(ratioDefinitionId);
      const benchmark = editingBenchmarks[ratioDefinitionId];

      if (!benchmark) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const benchmarkData = {
        user_id: user.id,
        ratio_definition_id: ratioDefinitionId,
        custom_industry_average: benchmark.custom_industry_average,
        custom_target_value: benchmark.custom_target_value,
        benchmark_source: benchmark.benchmark_source,
        notes: benchmark.notes,
        is_active: benchmark.is_active
      };

      const { error } = await supabase
        .from('user_ratio_benchmarks')
        .upsert(benchmarkData, {
          onConflict: 'user_id,ratio_definition_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Benchmark saved successfully",
      });

      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error saving benchmark:', error);
      toast({
        title: "Error",
        description: "Failed to save benchmark",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const resetToDefaults = (ratioDefinitionId: string) => {
    const ratio = ratioDefinitions.find(r => r.id === ratioDefinitionId);
    if (!ratio) return;

    setEditingBenchmarks(prev => ({
      ...prev,
      [ratioDefinitionId]: {
        ratio_definition_id: ratioDefinitionId,
        custom_industry_average: ratio.industry_average,
        custom_target_value: ratio.target_value,
        benchmark_source: 'Custom',
        notes: null,
        is_active: true
      }
    }));
  };

  const updateBenchmark = (ratioDefinitionId: string, field: keyof UserBenchmark, value: any) => {
    setEditingBenchmarks(prev => ({
      ...prev,
      [ratioDefinitionId]: {
        ...prev[ratioDefinitionId],
        [field]: value
      }
    }));
  };

  const exportBenchmarks = () => {
    const exportData = ratioDefinitions.map(ratio => {
      const benchmark = editingBenchmarks[ratio.id];
      return {
        ratio_name: ratio.ratio_name,
        ratio_category: ratio.ratio_category,
        default_industry_average: ratio.industry_average,
        default_target_value: ratio.target_value,
        custom_industry_average: benchmark?.custom_industry_average || null,
        custom_target_value: benchmark?.custom_target_value || null,
        benchmark_source: benchmark?.benchmark_source || 'Custom',
        notes: benchmark?.notes || ''
      };
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ratio-benchmarks.json';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading benchmark settings...</span>
      </div>
    );
  }

  const categorizedRatios = ratioDefinitions.reduce((acc, ratio) => {
    const category = ratio.ratio_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(ratio);
    return acc;
  }, {} as Record<string, RatioDefinition[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Benchmark Settings</h2>
          <p className="text-muted-foreground">
            Customize industry averages and target values for your ratio analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportBenchmarks}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {Object.entries(categorizedRatios).map(([category, ratios]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category}
              <Badge variant="secondary">{ratios.length} ratios</Badge>
            </CardTitle>
            <CardDescription>
              Configure benchmarks for {category.toLowerCase()} ratios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {ratios.map((ratio, index) => {
              const benchmark = editingBenchmarks[ratio.id];
              const hasCustomValues = benchmark?.custom_industry_average !== null || 
                                      benchmark?.custom_target_value !== null;

              return (
                <div key={ratio.id}>
                  {index > 0 && <Separator className="my-6" />}
                  
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{ratio.ratio_name}</h4>
                        <p className="text-sm text-muted-foreground">{ratio.formula_description}</p>
                        {hasCustomValues && (
                          <Badge variant="outline" className="mt-1">Custom values set</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetToDefaults(ratio.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveBenchmark(ratio.id)}
                          disabled={saving === ratio.id}
                        >
                          {saving === ratio.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Default Industry Average</Label>
                        <div className="p-2 bg-muted rounded text-sm">
                          {ratio.industry_average?.toFixed(2) || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Default Target</Label>
                        <div className="p-2 bg-muted rounded text-sm">
                          {ratio.target_value?.toFixed(2) || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`custom-average-${ratio.id}`} className="text-xs">
                          Custom Industry Average
                        </Label>
                        <Input
                          id={`custom-average-${ratio.id}`}
                          type="number"
                          step="0.01"
                          placeholder="Enter custom value"
                          value={benchmark?.custom_industry_average || ''}
                          onChange={(e) => updateBenchmark(
                            ratio.id, 
                            'custom_industry_average', 
                            e.target.value ? parseFloat(e.target.value) : null
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`custom-target-${ratio.id}`} className="text-xs">
                          Custom Target
                        </Label>
                        <Input
                          id={`custom-target-${ratio.id}`}
                          type="number"
                          step="0.01"
                          placeholder="Enter custom value"
                          value={benchmark?.custom_target_value || ''}
                          onChange={(e) => updateBenchmark(
                            ratio.id, 
                            'custom_target_value', 
                            e.target.value ? parseFloat(e.target.value) : null
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Benchmark Source</Label>
                        <Select
                          value={benchmark?.benchmark_source || 'Custom'}
                          onValueChange={(value) => updateBenchmark(ratio.id, 'benchmark_source', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {benchmarkSources.map(source => (
                              <SelectItem key={source} value={source}>
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${ratio.id}`} className="text-xs">
                          Notes
                        </Label>
                        <Textarea
                          id={`notes-${ratio.id}`}
                          placeholder="Add notes about your benchmark values..."
                          value={benchmark?.notes || ''}
                          onChange={(e) => updateBenchmark(ratio.id, 'notes', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}