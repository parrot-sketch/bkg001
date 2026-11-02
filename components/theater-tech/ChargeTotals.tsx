'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChargeTotalsProps } from './charge-sheet.types';

function money(value: number): string {
  return `KSh ${value.toLocaleString()}`;
}

export function ChargeTotals({
  subtotal,
  total,
  discountStr,
  onDiscountChange,
  onDiscountBlur,
}: ChargeTotalsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="charge-discount" className="text-xs text-muted-foreground">Discount (KSh)</Label>
        <Input
          id="charge-discount"
          type="text"
          inputMode="decimal"
          className="h-9 rounded-none"
          value={discountStr}
          onChange={(event) => onDiscountChange(event.target.value)}
          onBlur={onDiscountBlur}
          aria-label="Discount amount"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        Subtotal <span className="ml-2 font-medium tabular-nums text-foreground">{money(subtotal)}</span>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Total</p>
        <p className="text-lg font-semibold tabular-nums text-primary">{money(total)}</p>
      </div>
    </div>
  );
}
