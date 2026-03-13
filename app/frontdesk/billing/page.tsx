'use client';

/**
 * Frontdesk Billing Page
 * 
 * Manage patient payments and billing.
 * Clean, professional, and structurally organized.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { BillingSummary } from './components/BillingSummary';
import { PendingPaymentsList } from './components/PendingPaymentsList';
import { PaymentDialog } from './components/PaymentDialog';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { CreditCard, Users, Clock, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Payments</h1>
            <p className="text-sm text-slate-500">
              Manage patient bills and collect payments
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <BillingSummary summary={summary} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/60 bg-white/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
                <p className="text-xl font-bold text-slate-900">{summary?.pendingCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</p>
                <p className="text-xl font-bold text-slate-900">KES {(summary?.totalCollected || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collection Rate</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary?.totalBilled ? Math.round((summary.totalCollected / summary.totalBilled) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
