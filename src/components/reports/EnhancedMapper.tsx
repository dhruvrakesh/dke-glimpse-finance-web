import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Search,
  Target,
  Wand2
} from "lucide-react";

interface TrialBalanceEntry {
  id: number;
  ledger_name: string;
  account_type: string;
  account_category: string;
  gpt_confidence: number;
  closing_balance: number;
}

interface MasterItem {
  id: number;
  schedule3_item: string;
  report_section: string;
  report_sub_section: string | null;
  report_type: string;
}

interface GPTMappingSuggestion {
  ledger_name: string;
  suggested_master_item_id: number;
  confidence: number;
  reasoning: string;
}

export const EnhancedMapper = () => {
  const [trialBalanceEntries, setTrialBalanceEntries] = useState<TrialBalanceEntry[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [gptSuggestions, setGptSuggestions] = useState<GPTMappingSuggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch trial balance entries
      const { data: entries, error: entriesError } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .order('ledger_name');

      if (entriesError) throw entriesError;
      setTrialBalanceEntries(entries || []);

      // Fetch master items
      const { data: masters, error: mastersError } = await supabase
        .from('schedule3_master_items')
        .select('*')
        .order('display_order');

      if (mastersError) throw mastersError;
      setMasterItems(masters || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load mapping data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIMappingSuggestions = async () => {
    try {
      setGeneratingSuggestions(true);
      
      // This would call an AI service to generate mapping suggestions
      // For now, we'll create some mock suggestions based on account types
      const suggestions: GPTMappingSuggestion[] = [];
      
      trialBalanceEntries.forEach(entry => {
        // Find potential matches based on account type and category
        const potentialMatches = masterItems.filter(master => {
          const masterType = master.report_section.toUpperCase();
          const entryType = entry.account_type;
          
          if (entryType === 'ASSETS' && masterType.includes('ASSET')) return true;
          if (entryType === 'LIABILITIES' && masterType.includes('LIABILITY')) return true;
          if (entryType === 'EQUITY' && masterType.includes('EQUITY')) return true;
          if (entryType === 'REVENUE' && masterType.includes('INCOME')) return true;
          if (entryType === 'EXPENSES' && masterType.includes('EXPENSE')) return true;
          
          return false;
        });

        if (potentialMatches.length > 0) {
          // Pick the best match (first one for simplicity)
          const bestMatch = potentialMatches[0];
          suggestions.push({
            ledger_name: entry.ledger_name,
            suggested_master_item_id: bestMatch.id,
            confidence: entry.gpt_confidence,
            reasoning: `Matched based on account type ${entry.account_type} to ${bestMatch.report_section}`
          });
        }
      });

      setGptSuggestions(suggestions);
      
      toast({
        title: "Success",
        description: `Generated ${suggestions.length} mapping suggestions`,
      });

    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI mapping suggestions",
        variant: "destructive"
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const applyMappingSuggestion = async (suggestion: GPTMappingSuggestion) => {
    try {
      // Get the latest financial period
      const { data: period } = await supabase
        .from('financial_periods')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!period) {
        toast({ title: "Error", description: "No financial period found", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('schedule3_mapping')
        .insert({
          tally_ledger_name: suggestion.ledger_name,
          master_item_id: suggestion.suggested_master_item_id,
          period_id: period.id
        });

      if (error) throw error;

      // Remove applied suggestion
      setGptSuggestions(prev => prev.filter(s => s.ledger_name !== suggestion.ledger_name));
      
      toast({
        title: "Success",
        description: "Mapping applied successfully",
      });

    } catch (error) {
      console.error('Error applying mapping:', error);
      toast({
        title: "Error",
        description: "Failed to apply mapping",
        variant: "destructive"
      });
    }
  };

  const bulkApplyHighConfidenceMappings = async () => {
    const highConfidenceSuggestions = gptSuggestions.filter(s => s.confidence >= 0.8);
    
    if (highConfidenceSuggestions.length === 0) {
      toast({
        title: "Info",
        description: "No high-confidence mappings to apply",
      });
      return;
    }

    try {
      // Get the latest financial period
      const { data: period } = await supabase
        .from('financial_periods')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!period) {
        toast({ title: "Error", description: "No financial period found", variant: "destructive" });
        return;
      }

      const mappings = highConfidenceSuggestions.map(suggestion => ({
        tally_ledger_name: suggestion.ledger_name,
        master_item_id: suggestion.suggested_master_item_id,
        period_id: period.id
      }));

      const { error } = await supabase
        .from('schedule3_mapping')
        .insert(mappings);

      if (error) throw error;

      // Remove applied suggestions
      setGptSuggestions(prev => prev.filter(s => s.confidence < 0.8));
      
      toast({
        title: "Success",
        description: `Applied ${highConfidenceSuggestions.length} high-confidence mappings`,
      });

    } catch (error) {
      console.error('Error applying bulk mappings:', error);
      toast({
        title: "Error",
        description: "Failed to apply bulk mappings",
        variant: "destructive"
      });
    }
  };

  const filteredSuggestions = gptSuggestions.filter(suggestion =>
    suggestion.ledger_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const variant = confidence >= 0.8 ? "default" : confidence >= 0.6 ? "secondary" : "destructive";
    return <Badge variant={variant}>{percentage}%</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Loading mapping data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI-Enhanced Chart of Accounts Mapper</h1>
        <p className="text-muted-foreground mt-2">
          Intelligent mapping suggestions powered by AI analysis of your trial balance
        </p>
      </div>

      {/* AI Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Mapping Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Button 
              onClick={generateAIMappingSuggestions}
              disabled={generatingSuggestions || trialBalanceEntries.length === 0}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {generatingSuggestions ? 'Generating...' : 'Generate AI Suggestions'}
            </Button>
            
            {gptSuggestions.length > 0 && (
              <Button 
                onClick={bulkApplyHighConfidenceMappings}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Auto-Apply High Confidence ({gptSuggestions.filter(s => s.confidence >= 0.8).length})
              </Button>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search suggestions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {gptSuggestions.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  AI Analysis Complete
                </span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Generated {gptSuggestions.length} mapping suggestions based on account types and GPT categorization.
                Review and apply suggestions below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions Table */}
      {filteredSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Mapping Suggestions ({filteredSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trial Balance Account</TableHead>
                    <TableHead>Suggested Schedule 3 Item</TableHead>
                    <TableHead>Report Section</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>AI Reasoning</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuggestions.map((suggestion, index) => {
                    const masterItem = masterItems.find(m => m.id === suggestion.suggested_master_item_id);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{suggestion.ledger_name}</TableCell>
                        <TableCell>{masterItem?.schedule3_item || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{masterItem?.report_section || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          {getConfidenceBadge(suggestion.confidence)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs">
                          {suggestion.reasoning}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => applyMappingSuggestion(suggestion)}
                              className="flex items-center gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Apply
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => setGptSuggestions(prev => prev.filter(s => s.ledger_name !== suggestion.ledger_name))}
                            >
                              <AlertCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {trialBalanceEntries.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Trial Balance Data</h3>
            <p className="text-muted-foreground">
              Upload trial balance data to generate AI mapping suggestions
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Suggestions State */}
      {trialBalanceEntries.length > 0 && gptSuggestions.length === 0 && !generatingSuggestions && (
        <Card>
          <CardContent className="text-center py-8">
            <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Ready for AI Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate AI Suggestions" to get intelligent mapping recommendations
            </p>
            <Button onClick={generateAIMappingSuggestions} className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Generate AI Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};