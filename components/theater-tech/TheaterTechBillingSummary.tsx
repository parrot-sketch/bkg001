'use client';

import { Loader2, Save, Receipt, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';

interface TheaterTechBillingSummaryProps {
  caseId: string;
  onEdit: () => void;
}

export function TheaterTechBillingSummary({ caseId, onEdit }: TheaterTechBillingSummaryProps) {
  const cs = useChargeSheet(caseId);

  if (cs.isLoading) {
    return (
      <Card className="border-[#e7d6bf] bg-white shadow-lg">
        <CardHeader className="bg-[#2c2e4b] text-white rounded-t-xl pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#caa26a]" />
            <CardTitle className="text-base font-semibold text-white">Charge Sheet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#caa26a]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#e7d6bf] bg-white shadow-lg">
      <CardHeader className="bg-[#2c2e4b] text-white rounded-t-xl pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#caa26a]" />
            <CardTitle className="text-base font-semibold text-white">Charge Sheet</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={onEdit}
            className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm h-8"
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Update Bill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Items</p>
            <p className="text-2xl font-bold text-[#2c2e4b] mt-0.5">{cs.chargeItems.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Amount</p>
            <p className="text-2xl font-bold text-[#2c2e4b] mt-0.5">
              KSH {cs.total.toLocaleString()}
            </p>
          </div>
        </div>
        {cs.chargeItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Subtotal: <span className="font-semibold text-slate-700">KSH {cs.subtotal.toLocaleString()}</span>
              {cs.discount > 0 && (
                <span className="ml-3 text-red-600">
                  Discount: <span className="font-semibold">-{cs.discountStr}%</span>
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
