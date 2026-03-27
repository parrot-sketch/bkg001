'use client';

/**
 * Frontdesk Billing Page
 * Clean, modern UI with simple elements
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { PaymentDialog } from './components/PaymentDialog';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { BillType } from '@/domain/enums/BillType';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  [BillType.CONSULTATION]: { label: 'Consultation', className: 'border-stone-200 text-stone-600' },
  [BillType.SURGERY]: { label: 'Surgery', className: 'border-stone-200 text-stone-600' },
  [BillType.LAB_TEST]: { label: 'Lab', className: 'border-stone-200 text-stone-600' },
  [BillType.FOLLOW_UP]: { label: 'Follow-up', className: 'border-stone-200 text-stone-600' },
  [BillType.OTHER]: { label: 'Other', className: 'border-stone-200 text-stone-600' },
};

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

  const filteredPayments = searchQuery
    ? pendingPayments.filter((p) =>
        p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pendingPayments;

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Payments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage patient bills and collect payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <p className="text-xs text-stone-400 font-medium">Total Billed</p>
            <p className="text-2xl font-bold text-stone-900 mt-1 tabular-nums">
              KES {(summary?.totalBilled || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <p className="text-xs text-stone-400 font-medium">Collected</p>
            <p className="text-2xl font-bold text-stone-900 mt-1 tabular-nums">
              KES {(summary?.totalCollected || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <p className="text-xs text-stone-400 font-medium">Pending</p>
            <p className="text-2xl font-bold text-stone-900 mt-1 tabular-nums">
              {summary?.pendingCount || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by patient name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 bg-white border-slate-200"
        />
      </div>

      {/* Payments List */}
      {isLoading ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-slate-500">
            Loading payments...
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-slate-900">
              {searchQuery ? 'No matching payments found' : 'No pending payments'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'All bills have been collected'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const payable = payment.totalAmount - payment.discount;
            const remaining = payable - payment.amountPaid;
            const billTypeCfg = BILL_TYPE_CONFIG[payment.billType] || BILL_TYPE_CONFIG.OTHER;

            return (
              <Card
                key={payment.id}
                className="border-slate-200 hover:border-slate-300 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Patient & Bill Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-slate-900">
                          {payment.patient?.firstName} {payment.patient?.lastName}
                        </p>
                        <Badge variant="outline" className={cn("text-xs", billTypeCfg.className)}>
                          {billTypeCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                        <span>{format(new Date(payment.billDate), 'MMM dd, yyyy')}</span>
                        {payment.appointment && (
                          <span className="text-slate-400">•</span>
                        )}
                        {payment.appointment && (
                          <span>{payment.appointment.time}</span>
                        )}
                        {payment.surgicalCase && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-stone-500 font-medium">
                              {payment.surgicalCase.procedureName || 'Surgery'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Balance Due</p>
                        <p className="text-xl font-bold text-slate-900">
                          KES {remaining.toLocaleString()}
                        </p>
                        {payment.discount > 0 && (
                          <p className="text-xs text-stone-400">
                            -{payment.discount.toLocaleString()} discount
                          </p>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium px-2.5 py-1",
                          payment.status === PaymentStatus.PART && "border-stone-300 text-stone-600",
                          payment.status === PaymentStatus.UNPAID && "border-stone-300 text-stone-600"
                        )}
                      >
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>

                      <Button
                        onClick={() => handleOpenPaymentDialog(payment)}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
