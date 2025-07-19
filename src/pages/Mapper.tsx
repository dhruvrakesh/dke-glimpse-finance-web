
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MasterItem {
  id: number;
  schedule3_item: string;
  report_section: string;
  report_sub_section: string | null;
  report_type: string;
}

interface MappingEntry {
  id: number;
  tally_ledger_name: string;
  master_item_id: number;
  schedule3_master_items?: MasterItem;
}

export const Mapper = () => {
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [mappings, setMappings] = useState<MappingEntry[]>([]);
  const [newMapping, setNewMapping] = useState({
    account: '',
    masterItemId: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMasterItems();
    fetchMappings();
  }, []);

  const fetchMasterItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule3_master_items')
        .select('*')
        .order('display_order');
      
      if (error) {
        console.error('Error fetching master items:', error);
        toast({ title: "Error", description: "Failed to load master items", variant: "destructive" });
      } else {
        setMasterItems(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching master items:', error);
      toast({ title: "Error", description: "Unexpected error loading master items", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule3_mapping')
        .select(`
          id,
          tally_ledger_name,
          master_item_id,
          schedule3_master_items (
            id,
            schedule3_item,
            report_section,
            report_sub_section,
            report_type
          )
        `)
        .order('tally_ledger_name');
      
      if (error) {
        console.error('Error fetching mappings:', error);
        toast({ title: "Error", description: "Failed to load mappings", variant: "destructive" });
      } else {
        setMappings(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching mappings:', error);
      toast({ title: "Error", description: "Unexpected error loading mappings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.account || !newMapping.masterItemId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('schedule3_mapping')
        .insert({
          tally_ledger_name: newMapping.account,
          master_item_id: parseInt(newMapping.masterItemId)
        });

      if (error) {
        console.error('Error creating mapping:', error);
        toast({ title: "Error", description: "Failed to create mapping", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Mapping created successfully" });
        setNewMapping({ account: '', masterItemId: '' });
        fetchMappings();
      }
    } catch (error) {
      console.error('Unexpected error creating mapping:', error);
      toast({ title: "Error", description: "Unexpected error creating mapping", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (id: number) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('schedule3_mapping')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mapping:', error);
        toast({ title: "Error", description: "Failed to delete mapping", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Mapping deleted successfully" });
        fetchMappings();
      }
    } catch (error) {
      console.error('Unexpected error deleting mapping:', error);
      toast({ title: "Error", description: "Unexpected error deleting mapping", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Chart of Accounts Mapper</h1>
        <p className="text-muted-foreground mt-2">
          Map trial balance accounts to Schedule 3 master items
        </p>
      </div>
      
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Add New Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Trial Balance Account"
              value={newMapping.account}
              onChange={(e) => setNewMapping(prev => ({ ...prev, account: e.target.value }))}
              disabled={loading}
            />
            <Select
              value={newMapping.masterItemId}
              onValueChange={(value) => setNewMapping(prev => ({ ...prev, masterItemId: value }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Schedule 3 Item" />
              </SelectTrigger>
              <SelectContent>
                {masterItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.schedule3_item} ({item.report_section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddMapping} disabled={loading}>
              {loading ? 'Adding...' : 'Add Mapping'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Current Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading mappings...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trial Balance Account</TableHead>
                  <TableHead>Schedule 3 Item</TableHead>
                  <TableHead>Report Section</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No mappings found. Create your first mapping above.
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{mapping.tally_ledger_name}</TableCell>
                      <TableCell>{mapping.schedule3_master_items?.schedule3_item || 'N/A'}</TableCell>
                      <TableCell>{mapping.schedule3_master_items?.report_section || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteMapping(mapping.id)}
                          disabled={loading}
                        >
                          {loading ? 'Deleting...' : 'Delete'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
