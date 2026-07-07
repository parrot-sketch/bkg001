'use client';

import { Button } from '@/components/ui/button';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import { DollarSign, CreditCard, Lock } from 'lucide-react';

interface BillingActionPanelProps {
  paymentId: number;
  balance: number;
  status: string;
  isFinalized: boolean;
  onRecordPayment: () => void;
  onFinalize?: () => void;
  onEdit?: () => void;
  isRecording?: boolean;
  isFinalizing?: boolean;
}

export function BillingActionPanel({
  onRecordPayment,
  onFinalize,
  onEdit,
  balance,
  status,
  isFinalized,
  isRecording,
  isFinalizing,
}: BillingActionPanelProps) {
  const isPaid = status === PaymentStatus.PAID;

  if (isPaid) {
    return (
      <div className="border border-[#e7d6bf] bg-white">
        <div className="px-4 py-3 border-b border-[#e7d6bf]">
          <div className="text-sm font-semibold text-[#2c2e4b]">Payment</div>
        </div>
        <div className="p-4">
          <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            Fully Paid
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b]">Actions</div>
      </div>
      <div className="p-4 space-y-2">
        {onEdit && !isFinalized && (
          <Button
            onClick={onEdit}
            variant="outline"
            className="w-full justify-start rounded-lg text-sm border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          >
            <DollarSign className="mr-2 h-4 w-4 text-[#caa26a]" />
            Edit Charge Sheet
          </Button>
        )}

        {onFinalize && !isFinalized && (
          <Button
            onClick={onFinalize}
            disabled={isFinalizing}
            variant="outline"
            className="w-full justify-start rounded-lg text-sm border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          >
            <Lock className="mr-2 h-4 w-4 text-[#caa26a]" />
            {isFinalizing ? 'Finalizing...' : 'Finalize Charge Sheet'}
          </Button>
        )}

        <Button
          onClick={onRecordPayment}
          disabled={isRecording}
          className="w-full justify-start rounded-lg text-sm bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isRecording ? 'Processing...' : `Collect Payment • KSH ${balance.toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
}
