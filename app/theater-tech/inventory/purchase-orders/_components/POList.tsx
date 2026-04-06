'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Eye, ShoppingCart, PackageCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceivePOModal } from '@/components/theater-tech/inventory/ReceivePOModal';

import type { PurchaseOrder } from './types';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800', PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-purple-100 text-purple-800', CANCELLED: 'bg-red-100 text-red-800',
};

export function POList({ purchaseOrders, onSubmit, onRefresh, loading }: {
  purchaseOrders: PurchaseOrder[]; onSubmit: (id: string) => void; onRefresh?: () => void; loading: boolean;
}) {
  const [fetchingPoId, setFetchingPoId] = useState<string | null>(null);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrder | null>(null);

  const handleReceiveClick = async (po: PurchaseOrder) => {
    if (fetchingPoId) return;
    setFetchingPoId(po.id);
    try {
      const response = await apiClient.request<any>(`/stores/purchase-orders/${po.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to fetch details');
      
      const detailedPo = response.data?.data || response.data;
      if (!detailedPo || !detailedPo.items) throw new Error('Invalid PO details returned');

      const processedItems = detailedPo.items.map((item: any) => ({
        ...item,
        quantity_outstanding: item.quantity_ordered - (item.quantity_received || 0)
      }));

      setSelectedPoForReceive({ ...po, items: processedItems });
    } catch (err) {
      toast.error('Failed to load purchase order details');
    } finally {
      setFetchingPoId(null);
    }
  };

  const getOutstandingCount = (items: any[]) => items.reduce((sum, item) => sum + (item.quantity_outstanding ?? (item.quantity_ordered - (item.quantity_received || 0))), 0);
  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>;
  if (purchaseOrders.length === 0) return (
    <div className="text-center py-12">
      <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-slate-900">No purchase orders found</p>
    </div>
  );

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>PO Number</TableHead><TableHead>Vendor</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead>Items</TableHead>
            <TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map(po => (
            <TableRow key={po.id}>
              <TableCell className="font-medium font-mono">{po.po_number}</TableCell>
              <TableCell>{po.vendor.name}</TableCell>
              <TableCell><Badge className={cn("text-xs", STATUS_STYLES[po.status])}>{po.status.replace('_', ' ')}</Badge></TableCell>
              <TableCell className="text-right font-semibold">KES {po.total_amount.toLocaleString()}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{po.items.length} item(s)</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                {po.status === 'DRAFT' && (
                  <Button variant="outline" size="sm" onClick={() => onSubmit(po.id)} className="gap-1">
                    <Send className="h-3 w-3" /> Submit
                  </Button>
                )}
                {po.status === 'APPROVED' && (
                  <Button size="sm" onClick={() => handleReceiveClick(po)} disabled={fetchingPoId === po.id} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                    {fetchingPoId === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />}
                    Receive items
                  </Button>
                )}
                {po.status === 'PARTIALLY_RECEIVED' && (
                  <Button variant="secondary" size="sm" onClick={() => handleReceiveClick(po)} disabled={fetchingPoId === po.id} className="gap-1">
                    {fetchingPoId === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />}
                    Receive items &middot; {getOutstandingCount(po.items)} remaining
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {selectedPoForReceive && (
        <ReceivePOModal 
          po={{
            id: selectedPoForReceive.id,
            po_number: selectedPoForReceive.po_number,
            vendor_name: selectedPoForReceive.vendor.name,
            line_items: selectedPoForReceive.items.map(item => ({
              id: String(item.id),
              inventory_item_id: String((item as any).inventory_item_id || item.id), // fallback mapping
              item_name: item.item_name,
              item_sku: (item as any).inventory_item?.sku || '',
              unit: (item as any).inventory_item?.unit_of_measure || 'UNIT',
              quantity_ordered: item.quantity_ordered,
              quantity_received_to_date: item.quantity_received || 0,
              quantity_outstanding: item.quantity_outstanding,
              unit_price: (item as any).unit_price || 0,
            }))
          }}
          onClose={() => setSelectedPoForReceive(null)}
          onSuccess={() => {
            setSelectedPoForReceive(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
