'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Boxes, Search, RefreshCw, AlertTriangle, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface Batch {
  id: string;
  batch_number: string;
  serial_number: string | null;
  expiry_date: string;
  quantity_remaining: number;
  cost_per_unit: number;
  inventory_item: { name: string; sku: string | null; category: string };
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
}

function BatchesContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItemId, setNewItemId] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newCost, setNewCost] = useState('0');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBatches();
      loadItems();
    }
  }, [isAuthenticated, user]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request<Batch[]>('/inventory/batches');
      if (response.success) setBatches(response.data ?? []);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  };

  const loadItems = async () => {
    try {
      const response = await apiClient.request<{ data: InventoryItem[]; pagination: any }>('/inventory/items?limit=500');
      if (response.success) setItems(response.data.data ?? []);
    } catch {}
  };

  const handleReceiveStock = async () => {
    if (!newItemId || !newBatch || !newExpiry || !newQty) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiClient.request('/inventory/batches', {
        method: 'POST',
        body: JSON.stringify({
          inventory_item_id: parseInt(newItemId),
          batch_number: newBatch,
          serial_number: newSerial || undefined,
          expiry_date: new Date(newExpiry).toISOString(),
          quantity: parseInt(newQty),
          cost_per_unit: parseFloat(newCost),
          notes: 'Received via Theater Tech',
        }),
      });
      if (!response.success) throw new Error(response.error || 'Failed');
      toast.success('Stock received successfully');
      setIsReceiveOpen(false);
      resetForm();
      loadBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error receiving stock');
    } finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setNewItemId(''); setNewBatch(''); setNewSerial(''); setNewExpiry(''); setNewQty('1'); setNewCost('0'); };

  const filteredBatches = (batches ?? []).filter(b => {
    const matchesSearch = !debouncedSearch ||
      b.inventory_item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(debouncedSearch.toLowerCase());
    if (showExpiringOnly) {
      const days = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
      return matchesSearch && days <= 30;
    }
    return matchesSearch;
  });

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batches & Stock</h1>
          <p className="text-sm text-slate-500 mt-1">Track stock batches, expiry, and receive new inventory</p>
        </div>
        <Button onClick={() => setIsReceiveOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Receive Stock
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search batches..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
            </div>
            <Button variant={showExpiringOnly ? "secondary" : "outline"} size="sm" onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className={showExpiringOnly ? "bg-amber-100 text-amber-900 border-amber-200" : ""}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Expiring Only
            </Button>
            <Button variant="outline" size="sm" onClick={loadBatches} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && batches.length === 0 ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Boxes className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No batches found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch / Serial</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty Rem.</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map(batch => {
                  const expiry = new Date(batch.expiry_date);
                  const isExpired = expiry < new Date();
                  const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
                  const isExpiringSoon = !isExpired && daysUntil <= 30;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.inventory_item.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{batch.batch_number}</span>
                          {batch.serial_number && <span className="text-xs font-mono text-muted-foreground">SN: {batch.serial_number}</span>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{batch.inventory_item.category}</Badge></TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-white"><AlertTriangle className="h-3 w-3" /> {daysUntil}d left</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{format(expiry, 'MMM d, yyyy')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">{batch.quantity_remaining}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{batch.cost_per_unit.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
        <SheetContent className="sm:max-w-[450px] overflow-y-auto">
          <form onSubmit={e => { e.preventDefault(); handleReceiveStock(); }} className="flex flex-col h-full">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Receive New Stock</SheetTitle>
              <SheetDescription>Enter details of the incoming inventory batch.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 py-6 space-y-6">
              <div className="space-y-2">
                <Label>Item <span className="text-red-500">*</span></Label>
                <select value={newItemId} onChange={e => setNewItemId(e.target.value)} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select Item...</option>
                  {(items ?? []).map(item => <option key={item.id} value={item.id}>{item.name} {item.sku ? `(${item.sku})` : ''}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Batch / Lot Number <span className="text-red-500">*</span></Label>
                <Input value={newBatch} onChange={e => setNewBatch(e.target.value)} placeholder="e.g. LOT-2026-X" required />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={newSerial} onChange={e => setNewSerial(e.target.value)} placeholder="Optional" className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity <span className="text-red-500">*</span></Label>
                  <Input type="number" min="1" value={newQty} onChange={e => setNewQty(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input type="number" min="0" step="0.01" value={newCost} onChange={e => setNewCost(e.target.value)} />
                </div>
              </div>
            </div>
            <SheetFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Receiving...' : 'Confirm Receipt'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function TheaterTechBatchesPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <BatchesContent />
    </Suspense>
  );
}
