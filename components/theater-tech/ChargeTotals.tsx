'use client';

/**
 * ChargeTotals
 *
 * Discount input and subtotal / discount / total summary for the
 * charge sheet.
 */

import { Input } from '@/components/ui/input';
import type { ChargeTotalsProps } from './charge-sheet.types';

export function ChargeTotals({
  subtotal,
  discount,
  total,
  discountStr,
  onDiscountChange,
  onDiscountBlur,
}: ChargeTotalsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#2c2e4b]">
          Bill Summary
        </p>
        <p className="text-xs text-slate-400">KSH</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Subtotal</p>
          <p className="text-sm font-semibold text-slate-900">
            {subtotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Discount</p>
          <Input
            type="text"
            inputMode="decimal"
            className="h-8 border-slate-200 bg-white text-sm font-semibold text-red-600"
            value={discountStr}
            onChange={(e) => onDiscountChange(e.target.value)}
            onBlur={onDiscountBlur}
            aria-label="Discount amount"
          />
        </div>
        <div className="rounded-xl bg-[#2c2e4b] p-3">
          <p className="text-[10px] uppercase tracking-wide text-white/60 mb-1">Total</p>
          <p className="text-lg font-bold text-[#caa26a]">
            {total.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
