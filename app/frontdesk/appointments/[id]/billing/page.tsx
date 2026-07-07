'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChargeSheet } from '@/hooks/billing/useChargeSheet';
import { useFinalizeChargeSheet } from '@/hooks/billing/useFinalizeChargeSheet';
import { useRecordPayment } from '@/hooks/billing/useRecordPayment';
import { SharedPaymentDialog } from '@/components/billing/SharedPaymentDialog';
import { ChargeSheetEditor } from '@/components/billing/ChargeSheetEditor';
import { ChargeSheetCard } from '@/components/billing/ChargeSheetCard';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';

export default function FrontdeskBillingPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id ? parseInt(params.id as string, 10) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { chargeSheet, isLoading, refetch } = useChargeSheet(appointmentId);
  const { finalizeChargeSheet, isPending: isFinalizing } = useFinalizeChargeSheet();
  const { recordPayment, isPending: isRecording } = useRecordPayment();

  const isFinalized = !!chargeSheet?.finalizedAt;
  const isPaid = chargeSheet?.status === 'PAID';
  const balance = chargeSheet?.balance || 0;

  useEffect(() => {
    if (!appointmentId) return;
    refetch();
  }, [appointmentId, refetch]);

  const handleFinalize = async () => {
    if (!appointmentId) return;
    await finalizeChargeSheet({ appointmentId });
    refetch();
  };

  if (!appointmentId || isNaN(appointmentId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#e7d6bf]">
        <AlertCircle className="h-12 w-12 text-[#caa26a] mb-4" />
        <h2 className="text-lg font-semibold text-[#2c2e4b]">Invalid Appointment</h2>
        <p className="text-sm text-[#2c2e4b]/60 mt-2">The appointment ID is invalid.</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4 rounded-lg border-[#e7d6bf]">
          Go Back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!chargeSheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#e7d6bf]">
        <AlertCircle className="h-12 w-12 text-[#caa26a] mb-4" />
        <h2 className="text-lg font-semibold text-[#2c2e4b]">No Charge Sheet Found</h2>
        <p className="text-sm text-[#2c2e4b]/60 mt-2 max-w-sm text-center">
          This appointment does not have a charge sheet yet. The doctor needs to complete the consultation and create a charge sheet first.
        </p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4 rounded-lg border-[#e7d6bf]">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-white/70 hover:text-white -ml-2 rounded-lg"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#2c2e4b]">Charge Sheet</h1>
          <p className="text-xs text-[#2c2e4b]/60">
            Appointment #{appointmentId} • {format(new Date(chargeSheet.billDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPaid && !isEditing && (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
              >
                Edit Charge Sheet
              </Button>
              {!isFinalized && (
                <Button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  size="sm"
                  className="h-8 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg"
                >
                  {isFinalizing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Finalizing...
                    </>
                  ) : (
                    'Finalize'
                  )}
                </Button>
              )}
              <Button
                onClick={() => setPaymentDialogOpen(true)}
                size="sm"
                className="h-8 text-xs bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white rounded-lg"
              >
                Record Payment
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

      <div className="rounded-xl border border-[#e7d6bf] bg-white shadow-sm">
        {isEditing ? (
          <div className="p-5">
            <ChargeSheetEditor
              appointmentId={appointmentId}
              existingItems={chargeSheet.billItems}
              onSaved={() => {
                setIsEditing(false);
                refetch();
              }}
            />
          </div>
        ) : (
          <ChargeSheetCard
            chargeSheet={chargeSheet}
            appointmentId={appointmentId}
            onEdit={() => setIsEditing(true)}
            onFinalize={handleFinalize}
          />
        )}
      </div>

      <SharedPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={chargeSheet}
        onRecord={async (amountPaid, paymentMethod) => {
          if (!chargeSheet) return;
          await recordPayment({
            paymentId: chargeSheet.id,
            amountPaid,
            paymentMethod,
          });
          setPaymentDialogOpen(false);
          refetch();
        }}
        isRecording={isRecording}
      />
    </div>
  );
}
