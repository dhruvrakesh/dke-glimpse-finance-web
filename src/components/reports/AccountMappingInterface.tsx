import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Zap, 
  Save,
  RefreshCw
} from "lucide-react";

interface UnmappedAccount {
  entry_id: number;
  ledger_name: string;
  debit: number;
  credit: number;
  closing_balance: number;
  suggested_account_code: string;
  suggested_account_name: string;
  confidence_score: number;
}

interface AccountHierarchy {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  report_category: string;
}

interface AccountMappingInterfaceProps {
  periodId: number;
  onMappingUpdate?: () => void;
}

export const AccountMappingInterface = ({ periodId, onMappingUpdate }: AccountMappingInterfaceProps) => {
  const [unmappedAccounts, setUnmappedAccounts] = useState<UnmappedAccount[]>([]);
  const [accountHierarchy, setAccountHierarchy] = useState<AccountHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMappings, setSelectedMappings] = useState<Record<number, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [periodId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch unmapped accounts
      const { data: unmappedData, error: unmappedError } = await supabase.rpc(
        'get_unmapped_accounts',
        { period_id_param: periodId }
      );

      if (unmappedError) throw unmappedError;

      // Fetch account hierarchy for mapping options
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('account_hierarchy')
        .select('id, account_code, account_name, account_type, report_category')
        .eq('is_active', true)
        .order('account_code');

      if (hierarchyError) throw hierarchyError;

      setUnmappedAccounts(unmappedData || []);
      setAccountHierarchy(hierarchyData || []);

      // Auto-apply high confidence suggestions
      const autoMappings: Record<number, string> = {};
      unmappedData?.forEach((account) => {
        if (account.confidence_score >= 0.8 && account.suggested_account_code) {
          const matchingHierarchy = hierarchyData?.find(h => 
            h.account_code === account.suggested_account_code
          );
          if (matchingHierarchy) {
            autoMappings[account.entry_id] = matchingHierarchy.id;
          }
        }
      });
      setSelectedMappings(autoMappings);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch unmapped accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApplyHighConfidence = async () => {
    const highConfidenceAccounts = unmappedAccounts.filter(account => 
      account.confidence_score >= 0.8 && account.suggested_account_code
    );

    const mappings = highConfidenceAccounts.map(account => {
      const matchingHierarchy = accountHierarchy.find(h => 
        h.account_code === account.suggested_account_code
      );
      return {
        entry_id: account.entry_id,
        account_hierarchy_id: matchingHierarchy?.id
      };
    }).filter(mapping => mapping.account_hierarchy_id);

    if (mappings.length === 0) {
      toast({
        title: "No mappings to apply",
        description: "No high-confidence suggestions available",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data, error } = await supabase.rpc(
        'bulk_apply_account_mappings',
        { mappings: mappings }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Applied ${(data as any)?.success_count || 0} mappings`,
      });

      await fetchData();
      onMappingUpdate?.();
    } catch (error) {
      console.error('Error applying mappings:', error);
      toast({
        title: "Error",
        description: "Failed to apply mappings",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplySelectedMappings = async () => {
    const mappings = Object.entries(selectedMappings).map(([entryId, hierarchyId]) => ({
      entry_id: parseInt(entryId),
      account_hierarchy_id: hierarchyId
    }));

    if (mappings.length === 0) {
      toast({
        title: "No mappings selected",
        description: "Please select mappings to apply",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data, error } = await supabase.rpc(
        'bulk_apply_account_mappings',
        { mappings }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Applied ${(data as any)?.success_count || 0} mappings`,
      });

      await fetchData();
      onMappingUpdate?.();
    } catch (error) {
      console.error('Error applying mappings:', error);
      toast({
        title: "Error",
        description: "Failed to apply mappings",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-100 text-green-800">High ({Math.round(score * 100)}%)</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium ({Math.round(score * 100)}%)</Badge>;
    return <Badge variant="outline">Low ({Math.round(score * 100)}%)</Badge>;
  };

  const filteredAccounts = unmappedAccounts.filter(account =>
    account.ledger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.suggested_account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Account Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading unmapped accounts...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unmappedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Account Mapping Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All accounts in this period have been mapped! Your financial reports will be fully accurate.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Account Mapping - {unmappedAccounts.length} Unmapped Accounts
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleBulkApplyHighConfidence} 
            disabled={processing}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Apply High Confidence ({unmappedAccounts.filter(a => a.confidence_score >= 0.8).length})
          </Button>
          <Button 
            onClick={handleApplySelectedMappings} 
            disabled={processing || Object.keys(selectedMappings).length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Apply Selected ({Object.keys(selectedMappings).length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ledger Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Suggested Mapping</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Select Mapping</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.entry_id}>
                  <TableCell className="font-medium">
                    {account.ledger_name}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(account.closing_balance || 0)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{account.suggested_account_name}</div>
                      <div className="text-sm text-muted-foreground">{account.suggested_account_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getConfidenceBadge(account.confidence_score)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedMappings[account.entry_id]?.toString() || ""}
                      onValueChange={(value) => {
        setSelectedMappings(prev => ({
          ...prev,
          [account.entry_id]: value
        }));
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select mapping" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountHierarchy.map((hierarchy) => (
                          <SelectItem key={hierarchy.id} value={hierarchy.id.toString()}>
                            <div>
                              <div className="font-medium">{hierarchy.account_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {hierarchy.account_code} - {hierarchy.account_type}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredAccounts.length} of {unmappedAccounts.length} unmapped accounts
        </div>
      </CardContent>
    </Card>
  );
};