'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, BarChart3, Clock, FileText, Package2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventorySummary, InventoryBatch } from './types';

export function OverviewTab({ summary, batches }: { summary: InventorySummary[]; batches: InventoryBatch[] }) {
  const categories = useMemo(() => {
    const map: Record<string, { count: number; value: number; items: number; lowStock: number }> = {};
    summary.forEach(s => {
      const cat = s.category || 'OTHER';
      if (!map[cat]) map[cat] = { count: 0, value: 0, items: 0, lowStock: 0 };
      map[cat].count += s.currentBalance;
      map[cat].value += s.totalValue;
      map[cat].items += 1;
      if (s.status !== 'OK') map[cat].lowStock += 1;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.value - a.value);
  }, [summary]);

  const lowStock = summary.filter(s => s.status === 'LOW_STOCK');
  const outOfStock = summary.filter(s => s.status === 'OUT_OF_STOCK');
  const expired = batches.filter(b => new Date(b.expiry_date) < new Date());
  const expiringSoon = batches.filter(b => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days > 0;
  });

  const recentMovements = useMemo(() =>
    summary.filter(s => s.lastMovement)
      .sort((a, b) => new Date(b.lastMovement!).getTime() - new Date(a.lastMovement!).getTime())
      .slice(0, 10), [summary]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Inventory by Category</CardTitle>
          <CardDescription>Distribution of items and value across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map(cat => (
              <div key={cat.name} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                  {cat.lowStock > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                </div>
                <div className="text-lg font-bold">{cat.items} items</div>
                <div className="text-xs text-muted-foreground">{cat.count.toLocaleString()} units &bull; KES {(cat.value / 1000).toFixed(0)}k</div>
                {cat.lowStock > 0 && <div className="text-xs text-amber-600 font-medium mt-1">{cat.lowStock} low stock</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={cn(lowStock.length === 0 && outOfStock.length === 0 && "opacity-60")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Items</CardTitle></CardHeader>
          <CardContent>
            {lowStock.length === 0 && outOfStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are well stocked</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...outOfStock, ...lowStock].slice(0, 8).map(item => (
                  <div key={item.itemId} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku || 'No SKU'}</p></div>
                    <Badge className={cn("text-xs", item.status === 'OUT_OF_STOCK' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                      {item.currentBalance} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(expiringSoon.length === 0 && expired.length === 0 && "opacity-60")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-red-500" /> Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            {expiringSoon.length === 0 && expired.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expiring batches</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expired.slice(0, 4).map(batch => (
                  <div key={batch.id} className="flex items-center justify-between py-1 border-b">
                    <div><p className="text-sm font-medium">{batch.inventory_item.name}</p><p className="text-xs text-red-600">Batch: {batch.batch_number}</p></div>
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  </div>
                ))}
                {expiringSoon.slice(0, 4).map(batch => {
                  const days = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={batch.id} className="flex items-center justify-between py-1 border-b">
                      <div><p className="text-sm font-medium">{batch.inventory_item.name}</p><p className="text-xs text-muted-foreground">Batch: {batch.batch_number}</p></div>
                      <Badge className="bg-amber-100 text-amber-700 text-xs">{days}d left</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Recent Stock Movements</CardTitle></CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent movements</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentMovements.map(item => (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{item.currentBalance}</TableCell>
                    <TableCell className="text-right">KES {item.totalValue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
