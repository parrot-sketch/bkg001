'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, Download } from 'lucide-react';
import { ChargeSheet } from '@/components/charge-sheet';
import { formatCurrency } from './utils';

interface ChargeSheetSectionProps {
  payment: {
    id: number;
    chargeSheetNo: string | null;
    totalAmount: number;
    discount: number;
    amountPaid: number;
    status: string;
    billItems: {
      id: number;
      serviceName: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }[];
  } | null;
  appointmentId: number;
}

export function ChargeSheetSection({ payment, appointmentId }: ChargeSheetSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="border-2 border-[#e7d6bf] mb-8">
        <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-2 border-b border-[#e7d6bf]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#2c2e4b] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#caa26a]" />
              CHARGE SHEET (Edit Mode)
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <ChargeSheet appointmentId={appointmentId} />
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="border-2 border-amber-200 bg-amber-50 mb-8">
        <div className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">No Charge Sheet</p>
            <p className="text-sm text-amber-600">No billing was recorded for this consultation</p>
          </div>
          <Button onClick={() => setIsEditing(true)}>Add Charge Sheet</Button>
        </div>
      </div>
    );
  }

  if (payment.billItems.length === 0) {
    return (
      <div className="border-2 border-amber-200 bg-amber-50 mb-8">
        <div className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">No Items in Charge Sheet</p>
            <p className="text-sm text-amber-600">The charge sheet exists but has no items</p>
          </div>
          <Button onClick={() => setIsEditing(true)}>Add Items</Button>
        </div>
      </div>
    );
  }

  const balanceDue = payment.totalAmount - payment.amountPaid;

  return (
    <div className="border-2 border-[#e7d6bf] mb-8">
      <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-2 border-b border-[#e7d6bf]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#2c2e4b] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#caa26a]" />
            CHARGE SHEET
          </h2>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[#2c2e4b]/70">
            Charge Sheet No:{' '}
            <span className="font-mono font-semibold text-[#2c2e4b]">{payment.chargeSheetNo || 'N/A'}</span>
          </span>
          <Badge
            className={
              payment.status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : payment.status === 'PART'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-white text-slate-800 border-[#e7d6bf]'
            }
          >
            {payment.status}
          </Badge>
        </div>

        <div className="border border-[#e7d6bf] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7d6bf] bg-[#e7d6bf]/20">
                <th className="text-left py-2 text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Item</th>
                <th className="text-center py-2 text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Qty</th>
                <th className="text-right py-2 text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Unit Price</th>
                <th className="text-right py-2 text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {payment.billItems.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-[#e7d6bf] last:border-b-0">
                  <td className="py-2 text-sm text-[#2c2e4b]">{item.serviceName}</td>
                  <td className="py-2 text-center text-sm text-[#2c2e4b]/70">{item.quantity}</td>
                  <td className="py-2 text-right text-sm text-[#2c2e4b]/70">{formatCurrency(item.unitCost)}</td>
                  <td className="py-2 text-right text-sm font-medium text-[#2c2e4b]">{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {payment.discount > 0 && (
                <tr className="border-t border-[#e7d6bf]">
                  <td colSpan={3} className="pt-3 text-right text-sm text-[#2c2e4b]/70">Discount</td>
                  <td className="pt-3 text-right text-sm font-medium text-rose-600">-{formatCurrency(payment.discount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-[#2c2e4b]">
                <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-[#2c2e4b]">TOTAL</td>
                <td className="pt-3 text-right text-base font-bold text-[#2c2e4b]">{formatCurrency(payment.totalAmount)}</td>
              </tr>
              {payment.amountPaid > 0 && (
                <tr className="border-t border-[#e7d6bf]">
                  <td colSpan={3} className="pt-3 text-right text-sm text-[#2c2e4b]/70">Amount Paid</td>
                  <td className="pt-3 text-right text-sm font-medium text-emerald-700">-{formatCurrency(payment.amountPaid)}</td>
                </tr>
              )}
              {balanceDue > 0 && (
                <tr className="border-t border-[#e7d6bf]">
                  <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-[#2c2e4b]">Balance Due</td>
                  <td className="pt-3 text-right text-sm font-semibold text-rose-600">{formatCurrency(balanceDue)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
