'use client';

/**
 * Frontdesk Billing Dashboard
 * Calm, professional frontend aligned with the main dashboard UI.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { PaymentDialog } from './components/PaymentDialog';
import { ChargeSheetGallery } from './components/ChargeSheetGallery';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Loader2 } from 'lucide-react';

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

  // Filter based on search query
  const filteredPayments = searchQuery
    ? pendingPayments.filter((p) =>
        p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pendingPayments;

  // Separate into Lifecycle groups
  const actionableChargeSheets = filteredPayments.filter(p => !!p.finalizedAt);
  const draftChargeSheets = filteredPayments.filter(p => !p.finalizedAt);

  const handleOpenPaymentDialog = (payment: PaymentWithRelations) => {
    console.log('[Billing] Opening payment dialog for payment:', payment.id, payment.billType);
    console.log('[Billing] Will set selectedPayment.id:', payment.id);
    setSelectedPayment(payment);
    console.log('[Billing] Calling setPaymentDialogOpen(true)');
    setPaymentDialogOpen(true);
    console.log('[Billing] handleOpenPaymentDialog complete');
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
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* Header aligned with dashboard style */}
      <section className="bg-slate-800 rounded-lg sm:rounded-xl p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold">Billing & Collections</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-tight">Manage patient clinical charge sheets and payments.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white/10 border-slate-600 text-white placeholder:text-slate-400 rounded-lg text-sm"
          />
        </div>
      </section>

      {/* Summary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200 shadow-sm rounded-lg sm:rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Outstanding</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-400">KES</span>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {(summary?.totalBilled || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-lg sm:rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-500 mb-1">Collected Today</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-400">KES</span>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {(summary?.totalCollected || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50 shadow-sm rounded-lg sm:rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-500 mb-1">Active Sheets</p>
            <div className="flex items-baseline">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {summary?.pendingCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content Tabs */}
      {isLoading ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mb-2" />
            <p className="text-sm">Loading charge sheets...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="actionable" className="w-full space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg h-auto">
            <TabsTrigger 
              value="actionable" 
              className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              Ready to Collect
              <span className="ml-2 bg-slate-900 text-white text-xs py-0.5 px-2 rounded-full">
                {actionableChargeSheets.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="draft" 
              className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all text-slate-500"
            >
              In Consultation
              <span className="ml-2 bg-slate-200 text-slate-700 text-xs py-0.5 px-2 rounded-full">
                {draftChargeSheets.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actionable" className="focus-visible:outline-none focus-visible:ring-0">
            <ChargeSheetGallery 
              payments={actionableChargeSheets} 
              onCollectPayment={handleOpenPaymentDialog}
              type="finalized"
              emptyMessageTitle="No collections pending"
              emptyMessageDesc="All finalized charge sheets have been processed."
            />
          </TabsContent>

          <TabsContent value="draft" className="focus-visible:outline-none focus-visible:ring-0">
            <ChargeSheetGallery 
              payments={draftChargeSheets} 
              onCollectPayment={() => {}} // Disabled for drafts
              type="draft"
              emptyMessageTitle="No active consultations"
              emptyMessageDesc="There are currently no active patient sessions generating sheets."
            />
          </TabsContent>
        </Tabs>
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
