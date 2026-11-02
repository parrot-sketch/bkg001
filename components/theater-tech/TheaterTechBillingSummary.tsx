'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import type { ChargeItem, Service } from '@/components/theater-tech/charge-sheet.types';

interface TheaterTechBillingSummaryProps {
  caseId: string;
  onEdit: () => void;
  suggestedServices?: Service[];
  /** Sit inside a parent record instead of drawing its own panel. */
  flush?: boolean;
  /** Hide the section button when the parent already offers the action. */
  showAction?: boolean;
}

function money(value: number): string {
  return `KSh ${value.toLocaleString()}`;
}

function lineKind(item: ChargeItem): string {
  if (item.id.startsWith('suggested-')) return 'Suggested';
  if (item.type === 'inventory') return 'Inventory';
  if (item.type === 'custom') return 'Custom';
  return 'Service';
}

export function TheaterTechBillingSummary({ caseId, onEdit, suggestedServices, flush, showAction = true }: TheaterTechBillingSummaryProps) {
  const cs = useChargeSheet(caseId, suggestedServices);

  return (
    <section className={flush ? 'border-t border-border' : 'bg-white border border-border'}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-primary bg-[#e7d6bf]/30 px-5 py-2.5">
        <h2 className="text-sm font-semibold text-primary">Charge sheet</h2>
        {showAction && (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onEdit} disabled={cs.isLoading}>
            Update bill
          </Button>
        )}
      </div>
      {cs.isLoading ? (
        <p className="px-6 pb-4 text-sm text-muted-foreground">Loading charges…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {['Description', 'Type', 'Qty', 'Unit', 'Line'].map((column) => (
                <TableHead
                  key={column}
                  className={`h-9 bg-[#e7d6bf]/30 px-6 text-[11px] font-semibold uppercase tracking-wider text-secondary ${column === 'Qty' || column === 'Unit' || column === 'Line' ? 'text-right' : ''}`}
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cs.chargeItems.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={5} className="px-6 py-3 text-muted-foreground">No charges on this case.</TableCell>
              </TableRow>
            ) : (
              cs.chargeItems.map((item) => (
                <TableRow key={item.id} className="border-border hover:bg-[#e7d6bf]/30">
                  <TableCell className="px-6 py-2.5 font-medium text-foreground">{item.description}</TableCell>
                  <TableCell className="px-6 py-2.5 text-muted-foreground">{lineKind(item)}</TableCell>
                  <TableCell className="px-6 py-2.5 text-right tabular-nums text-foreground">{item.quantity}</TableCell>
                  <TableCell className="px-6 py-2.5 text-right tabular-nums text-foreground">{money(item.amount || 0)}</TableCell>
                  <TableCell className="px-6 py-2.5 text-right tabular-nums text-foreground">{money((item.amount || 0) * (item.quantity || 0))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {cs.chargeItems.length > 0 && (
            <TableFooter>
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={4} className="px-6 py-2 text-right text-muted-foreground">Subtotal</TableCell>
                <TableCell className="px-6 py-2 text-right tabular-nums text-foreground">{money(cs.subtotal)}</TableCell>
              </TableRow>
              {cs.discount > 0 && (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="px-6 py-2 text-right text-muted-foreground">Discount</TableCell>
                  <TableCell className="px-6 py-2 text-right tabular-nums text-foreground">{cs.discountStr}%</TableCell>
                </TableRow>
              )}
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={4} className="px-6 py-2.5 text-right font-medium text-foreground">Total</TableCell>
                <TableCell className="px-6 py-2.5 text-right font-semibold tabular-nums text-primary">{money(cs.total)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
      {cs.suggestedCount > 0 && (
        <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          Suggested lines come from the scheduled procedure. They are not on the bill until you save.
        </p>
      )}
    </section>
  );
}
