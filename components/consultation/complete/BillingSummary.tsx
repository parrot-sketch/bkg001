'use client';

import { Receipt, Info, CheckCircle } from 'lucide-react';
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
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-black">
        <Receipt className="h-3.5 w-3.5" />
        Billing
      </h3>

      {hasBilling ? (
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
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
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] items-center">
                  <CheckCircle className="h-3 w-3 mr-0.5" />
                  Paid
                </Badge>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            No billing items added. The doctor&apos;s default consultation fee will be applied.
          </span>
        </div>
      )}
    </div>
  );
}
