'use client';

import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type { InventorySummary } from './types';

export function ItemCatalogTable({ items, currentPage, totalPages, filteredCount, pageSize, onPageChange }: {
  items: InventorySummary[]; currentPage: number; totalPages: number; filteredCount: number;
  pageSize: number; onPageChange: (p: number) => void;
}) {
  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Product Name</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
            <TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Value</TableHead><TableHead className="text-right">In</TableHead>
            <TableHead className="text-right">Out</TableHead><TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No items found.</TableCell></TableRow>
          ) : items.map(item => (
            <TableRow key={item.itemId}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{item.sku || '—'}</span></TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
              <TableCell className="text-right">
                <span className={cn("font-bold text-lg", item.currentBalance === 0 ? "text-red-500" : item.status === 'LOW_STOCK' ? "text-amber-500" : "text-emerald-600")}>{item.currentBalance}</span>
              </TableCell>
              <TableCell className="text-right text-sm">{item.unitCost > 0 ? formatCurrency(item.unitCost) : '—'}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.totalValue)}</TableCell>
              <TableCell className="text-right"><span className="inline-flex items-center text-emerald-600 font-medium"><TrendingUp className="h-3 w-3 mr-1" />+{item.totalStockIn}</span></TableCell>
              <TableCell className="text-right"><span className="inline-flex items-center text-red-500 font-medium"><TrendingDown className="h-3 w-3 mr-1" />{item.totalStockOut}</span></TableCell>
              <TableCell className="text-center">
                <Badge className={cn("text-xs", item.status === 'OK' ? "bg-emerald-100 text-emerald-700" : item.status === 'LOW_STOCK' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                  {item.status === 'OK' ? 'In Stock' : item.status === 'LOW_STOCK' ? 'Low' : 'Out'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
          <div className="text-sm text-muted-foreground">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredCount)} of {filteredCount}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
