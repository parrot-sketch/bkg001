'use client';

import { format } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryBatch } from './types';

export function BatchesTable({ batches }: { batches: InventoryBatch[] }) {
  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Batch</TableHead>
            <TableHead>Category</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No batches found.</TableCell></TableRow>
          ) : batches.map(batch => {
            const expiry = new Date(batch.expiry_date);
            const isExpired = expiry < new Date();
            const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
            const isExpiringSoon = !isExpired && daysUntil <= 30;
            return (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">{batch.inventory_item.name}</TableCell>
                <TableCell><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{batch.inventory_item.sku || '—'}</span></TableCell>
                <TableCell className="text-sm font-medium">{batch.batch_number}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{batch.inventory_item.category}</Badge></TableCell>
                <TableCell>
                  {isExpired ? (
                    <div className="flex items-center gap-1.5 text-red-600"><Clock className="h-3.5 w-3.5" /><span className="text-sm font-medium">Expired</span></div>
                  ) : isExpiringSoon ? (
                    <div className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /><span className="text-sm font-medium">{daysUntil}d left</span></div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{format(expiry, 'MMM d, yyyy')}</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-lg">{batch.quantity_remaining}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
