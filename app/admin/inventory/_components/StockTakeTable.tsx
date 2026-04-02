'use client';

import { useState } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { InventorySummary } from './types';

export function StockTakeTable({ summary, onRefresh }: { summary: InventorySummary[]; onRefresh: () => void }) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  const handleAdjustment = async (itemId: number, currentBalance: number) => {
    const physical = parseInt(counts[itemId]);
    if (isNaN(physical)) { toast.error('Enter a valid count'); return; }
    const diff = physical - currentBalance;
    if (diff === 0) { toast.error('No difference'); return; }
    setSubmitting(itemId);
    try {
      const res = await fetch('/api/inventory/transaction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId, type: 'ADJUSTMENT', quantity: diff,
          notes: `Stock Take. Physical: ${physical}, System: ${currentBalance}. Diff: ${diff}.`
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Stock adjusted');
      setCounts(prev => { const nc = { ...prev }; delete nc[itemId]; return nc; });
      onRefresh();
    } catch { toast.error('Adjustment failed'); }
    finally { setSubmitting(null); }
  };

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Product / SKU</TableHead><TableHead className="text-right">System</TableHead>
            <TableHead className="text-center w-[150px]">Physical Count</TableHead>
            <TableHead className="text-right">Difference</TableHead><TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.map(item => {
            const physical = counts[item.itemId] !== undefined ? parseInt(counts[item.itemId]) : NaN;
            const diff = !isNaN(physical) ? physical - item.currentBalance : 0;
            return (
              <TableRow key={item.itemId}>
                <TableCell><div className="font-medium">{item.name}</div><div className="text-xs font-mono text-muted-foreground">{item.sku || 'NO SKU'}</div></TableCell>
                <TableCell className="text-right font-mono font-bold text-lg">{item.currentBalance}</TableCell>
                <TableCell className="text-center">
                  <Input type="number" placeholder="Count..." className="w-24 mx-auto h-9 text-center font-bold"
                    value={counts[item.itemId] || ''} onChange={e => setCounts(prev => ({ ...prev, [item.itemId]: e.target.value }))} />
                </TableCell>
                <TableCell className={cn("text-right font-bold", diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground")}>
                  {!isNaN(physical) ? (diff > 0 ? `+${diff}` : diff) : '--'}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={diff !== 0 && !isNaN(physical) ? "default" : "outline"}
                    disabled={diff === 0 || isNaN(physical) || submitting === item.itemId}
                    onClick={() => handleAdjustment(item.itemId, item.currentBalance)} className="gap-2">
                    {submitting === item.itemId ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ClipboardCheck className="h-3 w-3" />}
                    Reconcile
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
