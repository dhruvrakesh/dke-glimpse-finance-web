import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Search,
  Target,
  Wand2,
  TrendingUp,
  Filter,
  ArrowRight
} from "lucide-react";

interface TrialBalanceEntry {
  id: number;
  ledger_name: string;
  account_type: string;
  account_category: string;
  gpt_confidence: number;
  closing_balance: number;
  upload_id?: string;
}

interface MasterItem {
  id: number;
  schedule3_item: string;
  report_section: string;
  report_sub_section: string | null;
  report_type: string;
}

interface IntelligentSuggestion {
  ledger_name: string;
  suggested_master_item_id: number;
  confidence: number;
  reasoning: string;
  account_type: string;
  account_category: string;
  gpt_confidence: number;
}

interface ExistingMapping {
  id: number;
  tally_ledger_name: string;
  master_item_id: number;
  schedule3_master_items?: MasterItem;
}

export const IntelligentMapper = () => {
  const [trialBalanceEntries, setTrialBalanceEntries] = useState<TrialBalanceEntry[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [existingMappings, setExistingMappings] = useState<ExistingMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch GPT-parsed trial balance entries
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

      // Fetch existing mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('schedule3_mapping')
        .select(`
          id,
          tally_ledger_name,
          master_item_id,
          schedule3_master_items (*)
        `);

      if (mappingsError) throw mappingsError;
      setExistingMappings(mappings || []);

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

  const generateIntelligentSuggestions = async () => {
    try {
      setGeneratingSuggestions(true);
      
      // Get unmapped entries
      const mappedLedgers = new Set(existingMappings.map(m => m.tally_ledger_name));
      const unmappedEntries = trialBalanceEntries.filter(entry => 
        !mappedLedgers.has(entry.ledger_name)
      );

      const suggestions: IntelligentSuggestion[] = [];
      
      unmappedEntries.forEach(entry => {
        // Enhanced intelligent matching algorithm
        const potentialMatches = masterItems.filter(master => {
          const masterSection = master.report_section.toUpperCase();
          const masterItem = master.schedule3_item.toUpperCase();
          const entryType = entry.account_type?.toUpperCase() || '';
          const entryCategory = entry.account_category?.toUpperCase() || '';
          const entryName = entry.ledger_name.toUpperCase();
          
          // Primary matching by account type
          if (entryType === 'ASSETS' && masterSection.includes('ASSET')) return true;
          if (entryType === 'LIABILITIES' && masterSection.includes('LIABILITY')) return true;
          if (entryType === 'EQUITY' && masterSection.includes('EQUITY')) return true;
          if (entryType === 'REVENUE' && (masterSection.includes('INCOME') || masterSection.includes('REVENUE'))) return true;
          if (entryType === 'EXPENSES' && (masterSection.includes('EXPENSE') || masterSection.includes('EXPENDITURE'))) return true;
          
          // Enhanced category matching
          if (entryCategory.includes('CURRENT') && masterItem.includes('CURRENT')) return true;
          if (entryCategory.includes('FIXED') && masterItem.includes('FIXED')) return true;
          if (entryCategory.includes('CASH') && masterItem.includes('CASH')) return true;
          
          // Special handling for loans and borrowings
          if (entryCategory.includes('LOANS') || entryName.includes('LOAN') || entryName.includes('OD')) {
            if (masterItem.includes('BORROWING') || masterSection.includes('BORROWING')) return true;
          }
          
          // Overdraft specific matching
          if (entryName.includes('OD') || entryName.includes('OVERDRAFT')) {
            if (masterItem.includes('CURRENT') || masterItem.includes('SHORT')) return true;
          }
          
          // Fallback: calculate match score for any item with same type
          if (entryType && masterSection.includes(entryType.replace('LIABILITIES', 'LIABILITY'))) {
            return calculateMatchScore(entry, master) > 0.3;
          }
          
          return false;
        });

        if (potentialMatches.length > 0) {
          // Sort by relevance and pick best match
          const bestMatch = potentialMatches.sort((a, b) => {
            const aScore = calculateMatchScore(entry, a);
            const bScore = calculateMatchScore(entry, b);
            return bScore - aScore;
          })[0];

          // Calculate confidence based on GPT confidence and match quality
          const matchScore = calculateMatchScore(entry, bestMatch);
          const combinedConfidence = (entry.gpt_confidence + matchScore) / 2;

          suggestions.push({
            ledger_name: entry.ledger_name,
            suggested_master_item_id: bestMatch.id,
            confidence: combinedConfidence,
            reasoning: generateReasoning(entry, bestMatch),
            account_type: entry.account_type || 'Unknown',
            account_category: entry.account_category || 'Unknown',
            gpt_confidence: entry.gpt_confidence
          });
        }
      });

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);
      setIntelligentSuggestions(suggestions);
      
      toast({
        title: "Intelligence Complete",
        description: `Generated ${suggestions.length} smart mapping suggestions`,
      });

    } catch (error) {
      console.error('Error generating intelligent suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate intelligent mapping suggestions",
        variant: "destructive"
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const calculateMatchScore = (entry: TrialBalanceEntry, master: MasterItem): number => {
    let score = 0;
    const entryType = entry.account_type?.toUpperCase() || '';
    const entryCategory = entry.account_category?.toUpperCase() || '';
    const entryName = entry.ledger_name.toUpperCase();
    const masterSection = master.report_section.toUpperCase();
    const masterItem = master.schedule3_item.toUpperCase();
    
    // Enhanced semantic keyword mapping
    const semanticMappings = {
      // Loan/Borrowing terms
      'LOAN': ['BORROWING', 'DEBT', 'CREDIT', 'ADVANCES'],
      'BORROWING': ['LOAN', 'DEBT', 'CREDIT'],
      'OVERDRAFT': ['BANK OVERDRAFT', 'CURRENT LIABILITY', 'SHORT TERM BORROWING'],
      'OD': ['OVERDRAFT', 'BANK OVERDRAFT', 'CURRENT LIABILITY'],
      'TERM LOAN': ['LONG TERM BORROWING', 'BORROWING'],
      'BANK LOAN': ['BORROWING', 'BANK BORROWING'],
      
      // Asset terms  
      'CASH': ['CASH AND CASH EQUIVALENT', 'CASH IN HAND'],
      'BANK': ['CASH AND CASH EQUIVALENT', 'BANK BALANCE'],
      'RECEIVABLE': ['TRADE RECEIVABLE', 'DEBTORS'],
      'INVENTORY': ['STOCK', 'STOCK IN TRADE'],
      
      // Liability terms
      'PAYABLE': ['TRADE PAYABLE', 'CREDITORS'],
      'ACCRUED': ['CURRENT LIABILITY', 'ACCRUAL'],
    };
    
    // Type matching (highest weight)
    if (entryType === 'ASSETS' && masterSection.includes('ASSET')) score += 0.4;
    if (entryType === 'LIABILITIES' && masterSection.includes('LIABILITY')) score += 0.4;
    if (entryType === 'EQUITY' && masterSection.includes('EQUITY')) score += 0.4;
    if (entryType === 'REVENUE' && (masterSection.includes('INCOME') || masterSection.includes('REVENUE'))) score += 0.4;
    if (entryType === 'EXPENSES' && (masterSection.includes('EXPENSE') || masterSection.includes('EXPENDITURE'))) score += 0.4;
    
    // Enhanced category and semantic matching
    if (entryCategory.includes('CURRENT') && masterItem.includes('CURRENT')) score += 0.3;
    if (entryCategory.includes('FIXED') && masterItem.includes('FIXED')) score += 0.3;
    if (entryCategory.includes('CASH') && masterItem.includes('CASH')) score += 0.3;
    
    // Specific loan/borrowing semantic matching (high weight for these cases)
    if (entryCategory.includes('LOANS') || entryName.includes('LOAN') || entryName.includes('OD')) {
      if (masterItem.includes('BORROWING') || masterSection.includes('BORROWING')) {
        score += 0.35;
      }
      // Bank overdraft specific matching
      if ((entryName.includes('OD') || entryName.includes('OVERDRAFT')) && 
          (masterItem.includes('CURRENT') || masterItem.includes('SHORT'))) {
        score += 0.3;
      }
    }
    
    // Enhanced semantic similarity with keyword mapping
    const entryWords = entryName.toLowerCase().split(/\s+/);
    const masterWords = masterItem.toLowerCase().split(/\s+/);
    
    // Direct word matching
    let semanticScore = 0;
    entryWords.forEach(entryWord => {
      masterWords.forEach(masterWord => {
        if (entryWord.includes(masterWord) || masterWord.includes(entryWord)) {
          semanticScore += 0.1;
        }
      });
      
      // Check semantic mappings
      Object.entries(semanticMappings).forEach(([key, synonyms]) => {
        if (entryWord.includes(key.toLowerCase())) {
          synonyms.forEach(synonym => {
            if (masterItem.includes(synonym)) {
              semanticScore += 0.15;
            }
          });
        }
      });
    });
    
    score += Math.min(semanticScore, 0.3);
    
    return Math.min(score, 1.0);
  };

  const generateReasoning = (entry: TrialBalanceEntry, master: MasterItem): string => {
    const reasons = [];
    
    if (entry.account_type) {
      reasons.push(`Account type "${entry.account_type}" matches "${master.report_section}"`);
    }
    
    if (entry.account_category) {
      reasons.push(`Category "${entry.account_category}" aligns with classification`);
    }
    
    if (entry.gpt_confidence > 0.8) {
      reasons.push(`High GPT confidence (${Math.round(entry.gpt_confidence * 100)}%)`);
    }
    
    return reasons.join('; ');
  };

  const applyMappingSuggestion = async (suggestion: IntelligentSuggestion) => {
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

      // Remove applied suggestion and refresh data
      setIntelligentSuggestions(prev => prev.filter(s => s.ledger_name !== suggestion.ledger_name));
      await fetchData();
      
      toast({
        title: "Mapping Applied",
        description: `Successfully mapped "${suggestion.ledger_name}"`,
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
    const highConfidenceSuggestions = intelligentSuggestions.filter(s => s.confidence >= 0.85);
    
    if (highConfidenceSuggestions.length === 0) {
      toast({
        title: "No High-Confidence Mappings",
        description: "No mappings with 85%+ confidence available",
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

      // Remove applied suggestions and refresh data
      setIntelligentSuggestions(prev => prev.filter(s => s.confidence < 0.85));
      await fetchData();
      
      toast({
        title: "Bulk Mapping Complete",
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

  // Filter suggestions
  const filteredSuggestions = intelligentSuggestions.filter(suggestion => {
    const matchesSearch = suggestion.ledger_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConfidence = filterConfidence === 'all' || 
      (filterConfidence === 'high' && suggestion.confidence >= 0.8) ||
      (filterConfidence === 'medium' && suggestion.confidence >= 0.6 && suggestion.confidence < 0.8) ||
      (filterConfidence === 'low' && suggestion.confidence < 0.6);
    const matchesType = filterAccountType === 'all' || suggestion.account_type === filterAccountType;
    
    return matchesSearch && matchesConfidence && matchesType;
  });

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    if (confidence >= 0.85) return <Badge className="bg-green-500">{percentage}%</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-500">{percentage}%</Badge>;
    return <Badge variant="destructive">{percentage}%</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Loading intelligent mapping system...</div>
        </div>
      </div>
    );
  }

  const totalEntries = trialBalanceEntries.length;
  const mappedEntries = existingMappings.length;
  const mappingProgress = totalEntries > 0 ? (mappedEntries / totalEntries) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Intelligent Chart of Accounts Mapper</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered mapping using GPT-analyzed trial balance data with smart suggestions
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mapping Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Mapped Accounts</span>
              <span>{mappedEntries} of {totalEntries}</span>
            </div>
            <Progress value={mappingProgress} className="w-full" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{mappedEntries}</div>
                <div className="text-sm text-muted-foreground">Mapped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{intelligentSuggestions.length}</div>
                <div className="text-sm text-muted-foreground">Suggestions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalEntries - mappedEntries}</div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Intelligence Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <Button 
              onClick={generateIntelligentSuggestions}
              disabled={generatingSuggestions || trialBalanceEntries.length === 0}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {generatingSuggestions ? 'Analyzing...' : 'Generate Smart Suggestions'}
            </Button>
            
            {intelligentSuggestions.length > 0 && (
              <Button 
                onClick={bulkApplyHighConfidenceMappings}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Auto-Apply High Confidence ({intelligentSuggestions.filter(s => s.confidence >= 0.85).length})
              </Button>
            )}
          </div>

          {intelligentSuggestions.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  AI Analysis Complete
                </span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Generated {intelligentSuggestions.length} intelligent suggestions using GPT confidence scores and semantic analysis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      {intelligentSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (80%+)</SelectItem>
                  <SelectItem value="medium">Medium (60-80%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ASSETS">Assets</SelectItem>
                  <SelectItem value="LIABILITIES">Liabilities</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="EXPENSES">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intelligent Suggestions Table */}
      {filteredSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Smart Mapping Suggestions ({filteredSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GPT-Analyzed Account</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Suggested Schedule 3 Item</TableHead>
                    <TableHead>AI Confidence</TableHead>
                    <TableHead>GPT Confidence</TableHead>
                    <TableHead>Reasoning</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuggestions.map((suggestion, index) => {
                    const masterItem = masterItems.find(m => m.id === suggestion.suggested_master_item_id);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{suggestion.ledger_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{suggestion.account_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{masterItem?.schedule3_item || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{masterItem?.report_section}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getConfidenceBadge(suggestion.confidence)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{Math.round(suggestion.gpt_confidence * 100)}%</Badge>
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
                              onClick={() => setIntelligentSuggestions(prev => 
                                prev.filter(s => s.ledger_name !== suggestion.ledger_name)
                              )}
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
            <h3 className="text-lg font-semibold mb-2">No GPT-Analyzed Data</h3>
            <p className="text-muted-foreground">
              Upload and process trial balance data with GPT Vision to enable intelligent mapping
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Suggestions State */}
      {trialBalanceEntries.length > 0 && intelligentSuggestions.length === 0 && !generatingSuggestions && (
        <Card>
          <CardContent className="text-center py-8">
            <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Ready for Intelligence</h3>
            <p className="text-muted-foreground mb-4">
              {totalEntries} GPT-analyzed accounts ready for intelligent mapping suggestions
            </p>
            <Button onClick={generateIntelligentSuggestions} className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Generate Smart Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};