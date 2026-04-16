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
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Bill Summary
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Review the totals before saving this consultation charge sheet.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
        <label className="text-sm font-medium text-slate-700">
          Discount (KSH)
        </label>
        <Input
          type="text"
          inputMode="decimal"
          className="h-10 border-slate-200 bg-white"
          value={discountStr}
          onChange={(e) => onDiscountChange(e.target.value)}
          onBlur={onDiscountBlur}
          aria-label="Discount amount"
        />
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        {discount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>KSH {subtotal.toLocaleString()}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Discount</span>
            <span className="text-red-500">
              − KSH {discount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Total</span>
          <span className="text-lg font-semibold text-slate-900">
            KSH {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
