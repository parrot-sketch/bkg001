'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Building 
} from 'lucide-react';
import { PaymentMethod, getPaymentMethodLabel } from '@/domain/enums/PaymentMethod';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

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

  useEffect(() => {
    if (payment) {
      const remaining = payment.totalAmount - payment.discount - payment.amountPaid;
      setPaymentAmount(remaining.toString());
      setPaymentMethod(PaymentMethod.CASH);
    }
  }, [payment]);

  const handleRecord = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onRecord(amount, paymentMethod);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const icons: Record<PaymentMethod, React.ReactNode> = {
      [PaymentMethod.CASH]: <Banknote className="h-4 w-4" />,
      [PaymentMethod.CARD]: <CreditCard className="h-4 w-4" />,
      [PaymentMethod.MOBILE_MONEY]: <Smartphone className="h-4 w-4" />,
      [PaymentMethod.BANK_TRANSFER]: <Building className="h-4 w-4" />,
    };
    return icons[method];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {payment && (
              <span>
                Collecting payment from {payment.patient?.firstName}{' '}
                {payment.patient?.lastName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-4 py-4">
            {/* Itemized Bill Details */}
            {payment.billItems && payment.billItems.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Services Rendered
                </p>
                <div className="space-y-1.5">
                  {payment.billItems.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{item.serviceName}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="text-xs">{item.quantity} × {item.unitCost.toLocaleString()}</span>
                        <span className="font-medium text-foreground w-20 text-right">
                          {item.totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Amount</span>
                <span>{payment.totalAmount.toLocaleString()}</span>
              </div>
              {payment.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{payment.discount.toLocaleString()}</span>
                </div>
              )}
              {payment.amountPaid > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Already Paid</span>
                  <span>-{payment.amountPaid.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Balance Due</span>
                <span>
                  {(
                    payment.totalAmount -
                    payment.discount -
                    payment.amountPaid
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(method)}
                        {getPaymentMethodLabel(method)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRecording}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRecord}
            disabled={!paymentAmount || isRecording}
          >
            {isRecording ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
