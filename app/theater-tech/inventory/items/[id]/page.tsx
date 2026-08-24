'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, FileEdit, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useRouter, useParams } from 'next/navigation';
import { ItemFormDialog } from '@/components/theater-tech/inventory/ItemFormDialog';
import { AdjustStockDialog } from '@/components/theater-tech/inventory/AdjustStockDialog';
import { format } from 'date-fns';

interface InventoryItemDetail {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  reorderPoint: number;
  lowStockThreshold: number;
  supplier: string | null;
  manufacturer: string | null;
  isActive: boolean;
  isBillable: boolean;
  isImplant: boolean;
  quantityOnHand: number;
  nearestExpiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Batch {
  id: number;
  batch_number: string;
  serial_number: string | null;
  expiry_date: Date;
  quantity_remaining: number;
  cost_per_unit: number;
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  reference: string | null;
  notes: string | null;
  created_at: Date;
}

function ItemDetailContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const itemId = parseInt(params.id as string, 10);

  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  useEffect(() => {
    if (isNaN(itemId)) return;
    loadItem();
    loadBatches();
    loadTransactions();
  }, [itemId, isAuthenticated]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/inventory/items/${itemId}`);
      if (res.success) {
        setItem(res.data.data || res.data);
      }
    } catch {
      toast.error('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await apiClient.get<any>(`/inventory/batches?itemId=${itemId}`);
      if (res.success) {
        setBatches(res.data.data || []);
      }
    } catch {
      // silently fail
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await apiClient.get<any>(`/inventory/transaction?itemId=${itemId}`);
      if (res.success) {
        setTransactions(res.data.data || []);
      }
    } catch {
      // silently fail
    }
  };

  const handleSaved = () => {
    setShowItemDialog(false);
    setShowAdjustDialog(false);
    loadItem();
    loadBatches();
    loadTransactions();
  };

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900">Item not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/theater-tech/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
            <p className="text-sm text-slate-500">{item.sku || 'No SKU'} · {item.category}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowItemDialog(true)}>
            <FileEdit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="default" onClick={() => setShowAdjustDialog(true)}>
            <Archive className="h-4 w-4 mr-2" /> Adjust Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
            <CardDescription>Derived from transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{item.quantityOnHand}</p>
            <p className="text-sm text-slate-500">{item.unitOfMeasure}</p>
            {item.quantityOnHand <= item.lowStockThreshold && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Below low stock threshold
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nearest Expiry</CardTitle>
            <CardDescription>Earliest batch expiry</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-900">
              {item.nearestExpiryDate ? format(new Date(item.nearestExpiryDate), 'MMM d, yyyy') : 'No batches'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Item status</CardDescription>
          </CardHeader>
          <CardContent>
            {item.isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            <div className="mt-4 space-y-1 text-sm text-slate-500">
              <p>Billable: {item.isBillable ? 'Yes' : 'No'}</p>
              <p>Implant: {item.isImplant ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Supplier</p>
            <p className="font-medium text-slate-900">{item.supplier || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Manufacturer</p>
            <p className="font-medium text-slate-900">{item.manufacturer || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Unit Cost</p>
            <p className="font-medium text-slate-900">${item.unitCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Reorder Point</p>
            <p className="font-medium text-slate-900">{item.reorderPoint}</p>
          </div>
          <div>
            <p className="text-slate-500">Low Stock Threshold</p>
            <p className="font-medium text-slate-900">{item.lowStockThreshold}</p>
          </div>
          <div>
            <p className="text-slate-500">Description</p>
            <p className="font-medium text-slate-900">{item.description || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Created</p>
            <p className="font-medium text-slate-900">{format(new Date(item.createdAt), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-slate-500">Last Updated</p>
            <p className="font-medium text-slate-900">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>{batches.length} batch(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No batches found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty Remaining</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_number}</TableCell>
                    <TableCell>{batch.serial_number || '—'}</TableCell>
                    <TableCell>{format(new Date(batch.expiry_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">{batch.quantity_remaining}</TableCell>
                    <TableCell className="text-right">${batch.cost_per_unit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
          <CardDescription>{transactions.length} transaction(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No transactions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                    <TableCell className={tx.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                    </TableCell>
                    <TableCell>${tx.unit_price.toFixed(2)}</TableCell>
                    <TableCell>${tx.total_value.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.reference || '—'}</TableCell>
                    <TableCell>{format(new Date(tx.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ItemFormDialog
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        item={item}
        onSaved={handleSaved}
      />

      <AdjustStockDialog
        open={showAdjustDialog}
        onOpenChange={setShowAdjustDialog}
        item={item}
        onSaved={handleSaved}
      />
    </div>
  );
}

export default function TheaterTechItemDetailPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ItemDetailContent />
    </Suspense>
  );
}