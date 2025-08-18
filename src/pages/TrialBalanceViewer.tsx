import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Filter, BarChart3, TrendingUp, AlertCircle } from "lucide-react";

interface TrialBalanceEntry {
  id: string;
  ledger_name: string;
  debit: number;
  credit: number;
  closing_balance: number;
  account_type: string;
  account_category: string;
  gpt_confidence?: number;
  period_id: number;
  created_at?: string;
}

interface FinancialPeriod {
  id: number;
  quarter: number;
  year: number;
  created_at: string;
}

export const TrialBalanceViewer = () => {
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch periods
      const { data: periodsData, error: periodsError } = await supabase
        .from('financial_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (periodsError) throw periodsError;
      setPeriods(periodsData || []);

      // Fetch trial balance entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .order('ledger_name');

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load trial balance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.ledger_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = accountTypeFilter === "all" || entry.account_type === accountTypeFilter;
    const matchesPeriod = selectedPeriod === "all" || entry.period_id.toString() === selectedPeriod;
    return matchesSearch && matchesType && matchesPeriod;
  });

  const accountTypes = [...new Set(entries.map(e => e.account_type))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;
    const variant = score >= 0.8 ? "default" : score >= 0.6 ? "secondary" : "destructive";
    return <Badge variant={variant}>{(score * 100).toFixed(0)}%</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Account Name', 'Debit', 'Credit', 'Closing Balance', 'Account Type', 'Category', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => [
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
    a.download = `trial_balance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const avgConfidence = filteredEntries.filter(e => e.gpt_confidence).reduce((sum, entry) => sum + (entry.gpt_confidence || 0), 0) / filteredEntries.filter(e => e.gpt_confidence).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Loading trial balance data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trial Balance Data Viewer</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze processed trial balance entries with AI categorization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{filteredEntries.length}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDebit)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{avgConfidence ? `${(avgConfidence * 100).toFixed(0)}%` : 'N/A'}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {periods.map(period => (
                  <SelectItem key={period.id} value={period.id.toString()}>
                    Q{period.quarter} {period.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No trial balance entries found</p>
              <p className="text-sm">Upload trial balance data to see entries here</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.ledger_name}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={entry.closing_balance >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(entry.closing_balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.account_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.account_category}</Badge>
                      </TableCell>
                      <TableCell>
                        {getConfidenceBadge(entry.gpt_confidence)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};