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
    <>
      {/* Discount */}
      <div className="flex items-center gap-3 pt-2">
        <label className="text-sm text-slate-600 shrink-0">
          Discount (KSH)
        </label>
        <Input
          type="text"
          inputMode="decimal"
          className="h-9 w-28"
          value={discountStr}
          onChange={(e) => onDiscountChange(e.target.value)}
          onBlur={onDiscountBlur}
          aria-label="Discount amount"
        />
      </div>

      {/* Totals */}
      <div className="pt-3 border-t space-y-1">
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
    </>
  );
}
