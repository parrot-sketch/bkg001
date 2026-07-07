'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import type { ChargeSheet } from '@/hooks/billing/useChargeSheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type PaymentLike = ChargeSheet | PaymentWithRelations;

function getPatientName(payment: PaymentLike): string {
  if ('patientName' in payment) {
    return payment.patientName || 'Unknown Patient';
  }
  return `${payment.patient?.firstName ?? ''} ${payment.patient?.lastName ?? ''}`.trim() || 'Unknown Patient';
}

interface SharedPaymentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   payment: PaymentLike | null;
   onRecord: (amount: number, method: PaymentMethod) => Promise<void>;
   isRecording: boolean;
 }

export function SharedPaymentDialog({
  open,
  onOpenChange,
  payment,
  onRecord,
  isRecording,
}: SharedPaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [error, setError] = useState<string | null>(null);

  const remaining = payment
    ? payment.totalAmount - payment.discount - payment.amountPaid
    : 0;

  useEffect(() => {
    if (payment && open) {
      setPaymentAmount(remaining > 0 ? String(remaining) : '');
      setPaymentMethod(PaymentMethod.CASH);
      setError(null);
    }
  }, [payment, open, remaining]);

  const handleAmountChange = (val: string) => {
    setPaymentAmount(val);
    const amount = parseFloat(val);
    if (!isNaN(amount) && amount > remaining && remaining > 0) {
      setError(`Amount cannot exceed remaining balance of KES ${remaining.toLocaleString()}`);
    } else {
      setError(null);
    }
  };

  const handleRecord = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (amount > remaining + 0.0001) {
      setError('Cannot collect more than the remaining balance');
      return;
    }
    await onRecord(amount, paymentMethod);
  };

  const getMethodIcon = (method: PaymentMethod, active: boolean) => {
    const className = cn('h-4 w-4 mb-1.5', active ? 'text-[#2c2e4b]' : 'text-[#2c2e4b]/40');
    switch (method) {
      case PaymentMethod.CASH:
        return <Banknote className={className} />;
      case PaymentMethod.CARD:
        return <CreditCard className={className} />;
      case PaymentMethod.MOBILE_MONEY:
        return <Smartphone className={className} />;
      case PaymentMethod.BANK_TRANSFER:
        return <Building className={className} />;
    }
  };

  const PAYMENT_METHODS = [
    { id: PaymentMethod.CASH, label: 'Cash' },
    { id: PaymentMethod.MOBILE_MONEY, label: 'M-PESA' },
    { id: PaymentMethod.CARD, label: 'Card' },
    { id: PaymentMethod.BANK_TRANSFER, label: 'Bank' },
  ];

  if (!payment) {
    return null;
  }

  const isFullPayment = remaining > 0 && parseFloat(paymentAmount) >= remaining - 0.0001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-[#e7d6bf] shadow-lg rounded-xl">
        <div className="bg-white px-5 py-5 border-b border-[#e7d6bf]">
          <Badge
            variant="outline"
            className="mb-2 bg-white text-[10px] font-semibold text-[#2c2e4b]/70 uppercase border-[#e7d6bf]"
          >
            Payment Collection
          </Badge>
          <DialogTitle className="text-xl font-bold text-[#2c2e4b]">
            Collect Balance
          </DialogTitle>
<DialogDescription className="text-[#2c2e4b]/60 text-sm mt-1">
             Receiving payment for {getPatientName(payment)}
           </DialogDescription>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#2c2e4b]">Amount Received</Label>
              {isFullPayment && parseFloat(paymentAmount) > 0 && (
                <span className="flex items-center text-[10px] font-medium text-[#2c2e4b] bg-[#e7d6bf]/30 px-2 py-0.5 border border-[#e7d6bf]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Full Balance
                </span>
              )}
            </div>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#2c2e4b]/40">
                KES
              </span>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={cn(
                  'h-14 pl-14 text-2xl font-bold text-[#2c2e4b] border rounded-xl shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-offset-0',
                  error
                    ? 'border-[#caa26a] focus-visible:ring-[#caa26a]/30'
                    : 'border-[#e7d6bf] focus-visible:border-[#caa26a] focus-visible:ring-[#caa26a]/30',
                )}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {error && (
              <p className="flex items-center text-[11px] font-medium text-[#2c2e4b] mt-1.5">
                <AlertCircle className="h-3 w-3 mr-1" />
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-[#2c2e4b]">Payment Method</Label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={cn(
                      'flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border transition-all duration-200',
                      isActive
                        ? 'border-[#caa26a] ring-1 ring-[#caa26a] bg-[#e7d6bf]/20'
                        : 'border-[#e7d6bf] bg-white hover:border-[#caa26a]/60 hover:bg-[#e7d6bf]/10',
                    )}
                  >
                    {getMethodIcon(method.id as PaymentMethod, isActive)}
                    <span
                      className={cn(
                        'text-[10px] font-medium mt-1 transition-colors',
                        isActive ? 'text-[#2c2e4b]' : 'text-[#2c2e4b]/60',
                      )}
                    >
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 bg-white border-t border-[#e7d6bf] flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRecording}
            className="text-[#2c2e4b] font-medium text-sm h-9 rounded-lg border-[#e7d6bf]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRecord}
            disabled={
              !paymentAmount ||
              isRecording ||
              !!error ||
              parseFloat(paymentAmount) <= 0
            }
            className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-medium text-sm h-9 rounded-lg shadow-sm active:scale-95 transition-transform ml-2 px-5"
          >
            {isRecording ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
