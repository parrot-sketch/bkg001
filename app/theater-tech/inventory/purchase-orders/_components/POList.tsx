'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Eye, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { PurchaseOrder } from './types';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800', PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-purple-100 text-purple-800', CANCELLED: 'bg-red-100 text-red-800',
};

export function POList({ purchaseOrders, onSubmit, loading }: {
  purchaseOrders: PurchaseOrder[]; onSubmit: (id: string) => void; loading: boolean;
}) {
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
