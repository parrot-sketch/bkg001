'use client';

/**
 * Frontdesk Billing Dashboard
 * Simple, clean billing interface for collecting payments.
 * Shows all pending payments (UNPAID + PART) in a single list.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { PaymentDialog } from './components/PaymentDialog';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Loader2,
  Receipt,
  CreditCard,
  Calendar,
  ChevronDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | PaymentStatus.UNPAID | PaymentStatus.PART;

export default function FrontdeskBillingPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: billingData, isLoading } = usePendingPayments(isAuthenticated);
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access billing</p>
      </div>
    );
  }

  const pendingPayments = billingData?.payments || [];
  const summary = billingData?.summary;

  // Filter payments by search and status
  const filteredPayments = pendingPayments.filter((p) => {
    const matchesSearch = searchQuery
      ? p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.chargeSheetNo?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate totals for filtered items
  const totalOutstanding = filteredPayments.reduce(
    (sum, p) => sum + (p.totalAmount - p.discount - p.amountPaid),
    0
  );

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

  const statusCounts = {
    all: pendingPayments.length,
    [PaymentStatus.UNPAID]: pendingPayments.filter(p => p.status === PaymentStatus.UNPAID).length,
    [PaymentStatus.PART]: pendingPayments.filter(p => p.status === PaymentStatus.PART).length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <section className="bg-slate-800 rounded-xl p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Billing & Collections</h1>
            <p className="text-slate-300 text-sm mt-1">Collect payments from patients</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patient or charge sheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/10 border-slate-600 text-white placeholder:text-slate-400 rounded-lg text-sm"
            />
          </div>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Outstanding</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-medium text-slate-400">KES</span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {totalOutstanding.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Collected Today</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-medium text-slate-400">KES</span>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                {(summary?.totalCollected || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending Bills</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {filteredPayments.length}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {(['all', PaymentStatus.UNPAID, PaymentStatus.PART] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px",
              statusFilter === status
                ? "bg-white text-slate-900 border border-b-0 border-slate-200 border-t-slate-900"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {status === 'all' ? 'All' : getPaymentStatusLabel(status)}
            <span className={cn(
              "ml-2 px-2 py-0.5 rounded-full text-xs",
              statusFilter === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Payment List */}
      {isLoading ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mb-2" />
            <p className="text-sm">Loading payments...</p>
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {searchQuery || statusFilter !== 'all' ? 'No matching bills' : 'All caught up!'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No pending payments right now'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const remaining = payment.totalAmount - payment.discount - payment.amountPaid;
            const isExpanded = expandedPaymentId === payment.id;
            const hasBillItems = payment.billItems && payment.billItems.length > 0;

            return (
              <Card
                key={payment.id}
                className={cn(
                  "overflow-hidden transition-all duration-200 border-slate-200",
                  isExpanded ? "shadow-sm bg-white" : "shadow-sm hover:border-slate-300 bg-white"
                )}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left - Patient Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Expand Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg flex-shrink-0",
                          hasBillItems ? "text-slate-400 hover:text-slate-700 hover:bg-slate-50" : "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => hasBillItems && setExpandedPaymentId(isExpanded ? null : payment.id)}
                        disabled={!hasBillItems}
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                      </Button>

                      {/* Icon */}
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-4 w-4 text-slate-600" />
                      </div>

                      {/* Patient Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {payment.patient?.firstName} {payment.patient?.lastName}
                          </p>
                          {payment.chargeSheetNo && (
                            <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {payment.chargeSheetNo}
                            </code>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0 h-5",
                              payment.status === PaymentStatus.UNPAID && "bg-rose-50 text-rose-700 border-rose-200",
                              payment.status === PaymentStatus.PART && "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {getPaymentStatusLabel(payment.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(payment.billDate), 'MMM dd, yyyy')}
                          <span className="text-slate-300">•</span>
                          <span className="capitalize">{payment.billType?.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right - Amount & Action */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase text-slate-400 mb-0.5">Balance Due</p>
                        <p className="text-lg font-bold text-slate-900 flex items-baseline gap-1">
                          <span className="text-[10px] text-slate-500 font-normal">KES</span>
                          {remaining.toLocaleString()}
                        </p>
                        {payment.discount > 0 && (
                          <p className="text-[10px] font-medium text-emerald-600">
                            -{payment.discount.toLocaleString()} discount
                          </p>
                        )}
                      </div>

                      <Button 
                        onClick={() => handleOpenPaymentDialog(payment)}
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-8 rounded-md px-4 text-xs"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Collect
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Items */}
                {isExpanded && hasBillItems && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/50">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 border-dashed">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Bill Items
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {payment.billItems?.length} items
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {payment.billItems!.map((item, idx) => (
                          <div
                            key={item.id ?? idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-700">{item.serviceName}</span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span className="text-xs">{item.quantity} × {item.unitCost.toLocaleString()}</span>
                              <span className="font-medium text-slate-900 w-20 text-right">
                                {item.totalCost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Subtotal</span>
                          <span className="font-medium text-slate-700">{payment.totalAmount.toLocaleString()}</span>
                        </div>
                        {payment.discount > 0 && (
                          <div className="flex items-center justify-between text-emerald-600">
                            <span>Discount</span>
                            <span>-{payment.discount.toLocaleString()}</span>
                          </div>
                        )}
                        {payment.amountPaid > 0 && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Paid</span>
                            <span>-{payment.amountPaid.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 font-semibold">
                          <span className="text-slate-700">Balance Due</span>
                          <span className="text-slate-900">{remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
