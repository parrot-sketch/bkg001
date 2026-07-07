'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingHeroBannerProps {
  payment: PaymentWithRelations;
  onRecordPayment: () => void;
  onEdit?: () => void;
  onFinalize?: () => void;
  isRecording?: boolean;
  isFinalizing?: boolean;
}

export function BillingHeroBanner({
  payment,
  onRecordPayment,
  onEdit,
  onFinalize,
  isRecording,
  isFinalizing,
}: BillingHeroBannerProps) {
  const remaining = payment.totalAmount - payment.discount - payment.amountPaid;
  const isPaid = payment.status === PaymentStatus.PAID;
  const isFinalized = !!payment.finalizedAt;

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
              <ReceiptIcon className="h-4 w-4 text-[#2c2e4b]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-[#2c2e4b] truncate">
                {isPaid ? 'Payment Complete' : isFinalized ? 'Payment Ready' : 'Charge Sheet'}
              </h1>
              {payment.chargeSheetNo && (
                <p className="text-xs text-[#2c2e4b]/60 mt-0.5">#{payment.chargeSheetNo}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#2c2e4b]/60">
<Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b]">
               Appointment #{payment.appointment?.id}
             </Badge>
            <span className="tabular-nums">
              {payment.patient?.firstName} {payment.patient?.lastName}
            </span>
            <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b]">
              {getPaymentStatusLabel(payment.status)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          {!isPaid && (
            <>
              {onEdit && !isFinalized && (
                <Button
                  onClick={onEdit}
                  variant="outline"
                  className="h-9 rounded-lg border-[#e7d6bf] text-[#2c2e4b] text-xs"
                >
                  Edit
                </Button>
              )}
              {onFinalize && !isFinalized && (
                <Button
                  onClick={onFinalize}
                  disabled={isFinalizing}
                  className="h-9 rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] text-xs"
                >
                  {isFinalizing ? 'Finalizing...' : 'Finalize'}
                </Button>
              )}
              <Button
                onClick={onRecordPayment}
                disabled={isRecording}
                className="h-9 rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white text-xs"
              >
                {isRecording ? 'Processing...' : `Collect KSH ${remaining.toLocaleString()}`}
              </Button>
            </>
          )}
          {isPaid && (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              Fully Paid
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
