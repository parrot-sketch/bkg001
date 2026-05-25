'use client';

import { Badge } from '@/components/ui/badge';

interface BillItem {
  serviceId: number | string;
  serviceName: string;
  totalCost: number;
}

interface BillingSummaryProps {
  hasBilling: boolean;
  billItems: BillItem[];
  totalAmount: number;
  discount: number;
  status?: string;
}

export function BillingSummary({
  hasBilling,
  billItems,
  totalAmount,
  discount,
  status,
}: BillingSummaryProps) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
        Billing
      </h3>

      {hasBilling ? (
        <div className="bg-white border border-slate-200 p-3 space-y-2">
          <div className="space-y-1">
            {billItems.map((item, index) => (
              <div key={`${item.serviceId}-${index}`} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.serviceName}</span>
                <span className="font-bold text-slate-900">
                  KSH {item.totalCost.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
            {discount > 0 && (
              <span className="text-xs text-slate-400">
                Discount: - KSH {discount.toLocaleString()}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="font-bold text-slate-700">Total:</span>
              <span className="font-bold text-slate-900">
                KSH {totalAmount.toLocaleString()}
              </span>
              {status === 'PAID' && (
                <Badge variant="outline" className="text-[10px] items-center rounded-none">
                  PAID
                </Badge>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-slate-200 bg-white text-xs text-slate-700">
          No billing items recorded. The consultation fee will be applied on completion.
        </div>
      )}
    </div>
  );
}
