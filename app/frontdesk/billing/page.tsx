'use client';

/**
 * Frontdesk Billing Page
 * 
 * Manage patient payments and billing.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { BillingSummary } from './components/BillingSummary';
import { PendingPaymentsList } from './components/PendingPaymentsList';
import { PaymentDialog } from './components/PaymentDialog';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';

export default function FrontdeskBillingPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: billingData, isLoading } = usePendingPayments(isAuthenticated);
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access billing</p>
      </div>
    );
  }

  const pendingPayments = billingData?.payments || [];
  const summary = billingData?.summary;

  const handleOpenPaymentDialog = (payment: PaymentWithRelations) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async (amount: number, method: PaymentMethod) => {
    if (!selectedPayment) return;

    await recordPayment({
      paymentId: selectedPayment.id,
      amountPaid: amount,
      paymentMethod: method,
    });

    setPaymentDialogOpen(false);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Payments</h1>
        <p className="text-slate-500 mt-1">
          Manage patient payments and view daily billing performance
        </p>
      </div>

      {/* Summary Cards */}
      <BillingSummary summary={summary} />

      {/* Pending Payments List */}
      <PendingPaymentsList 
        payments={pendingPayments}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCollectPayment={handleOpenPaymentDialog}
      />

      {/* Record Payment Dialog */}
      <PaymentDialog 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={selectedPayment}
        onRecord={handleRecordPayment}
        isRecording={isRecording}
      />
    </div>
  );
}
