'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
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
  AlertCircle
} from 'lucide-react';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithRelations | null;
  onRecord: (amount: number, method: PaymentMethod) => Promise<void>;
  isRecording: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  onRecord,
  isRecording,
}: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [error, setError] = useState<string | null>(null);

  const remaining = payment 
    ? payment.totalAmount - payment.discount - payment.amountPaid 
    : 0;

  useEffect(() => {
    if (payment && open) {
      setPaymentAmount(remaining.toString());
      setPaymentMethod(PaymentMethod.CASH);
      setError(null);
    }
  }, [payment, open, remaining]);

  const handleAmountChange = (val: string) => {
    setPaymentAmount(val);
    const amount = parseFloat(val);
    if (!isNaN(amount) && amount > remaining) {
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
    if (amount > remaining) {
      setError('Cannot collect more than the remaining balance');
      return;
    }
    await onRecord(amount, paymentMethod);
  };

  const getMethodIcon = (method: PaymentMethod, active: boolean) => {
    const className = cn("h-4 w-4 mb-1.5", active ? "text-slate-900" : "text-slate-400");
    switch (method) {
      case PaymentMethod.CASH: return <Banknote className={className} />;
      case PaymentMethod.CARD: return <CreditCard className={className} />;
      case PaymentMethod.MOBILE_MONEY: return <Smartphone className={className} />;
      case PaymentMethod.BANK_TRANSFER: return <Building className={className} />;
    }
  };

  const PAYMENT_METHODS = [
    { id: PaymentMethod.CASH, label: 'Cash' },
    { id: PaymentMethod.MOBILE_MONEY, label: 'M-PESA' },
    { id: PaymentMethod.CARD, label: 'Card' },
    { id: PaymentMethod.BANK_TRANSFER, label: 'Bank' },
  ];

  if (!payment) {
    console.log('[PaymentDialog] No payment, returning null. open:', open);
    return null;
  }

  const isFullPayment = parseFloat(paymentAmount) === remaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-slate-200 shadow-xl rounded-xl">
        <div className="bg-slate-50/80 px-5 py-5 border-b border-slate-100">
          <Badge variant="outline" className="mb-2 bg-white text-[10px] font-semibold text-slate-500 uppercase border-slate-200">
            Payment Collection
          </Badge>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Collect Balance
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm mt-1">
            Receiving payment for {payment.patient?.firstName} {payment.patient?.lastName}
          </DialogDescription>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Amount Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">Amount Received</Label>
              {isFullPayment && parseFloat(paymentAmount) > 0 && (
                <span className="flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Full Balance
                </span>
              )}
            </div>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
                KES
              </span>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={cn(
                  "h-14 pl-14 text-2xl font-bold text-slate-900 border rounded-lg shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-offset-0",
                  error ? "border-rose-300 focus-visible:ring-rose-200" : "border-slate-200 focus-visible:border-slate-400 focus-visible:ring-slate-300"
                )}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {error && (
              <p className="flex items-center text-[11px] font-medium text-rose-500 mt-1.5">
                <AlertCircle className="h-3 w-3 mr-1" />
                {error}
              </p>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-slate-700">Payment Method</Label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border transition-all duration-200",
                      isActive 
                        ? "border-slate-800 ring-1 ring-slate-800 bg-slate-50" 
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    {getMethodIcon(method.id as PaymentMethod, isActive)}
                    <span className={cn(
                      "text-[10px] font-medium mt-1 transition-colors",
                      isActive ? "text-slate-900" : "text-slate-500"
                    )}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRecording}
            className="text-slate-600 font-medium text-sm h-9 rounded-lg"
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
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm h-9 rounded-lg shadow-sm active:scale-95 transition-transform ml-2 px-5"
          >
            {isRecording ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
