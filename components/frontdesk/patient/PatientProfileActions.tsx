'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { cn } from '@/lib/utils';

interface PatientProfileActionsProps {
  patientId: string;
  patientName: string;
  className?: string;
}

/**
 * The two "what happens next" actions for a patient at the desk.
 * Both refresh the server-rendered profile on success so visits update immediately.
 */
export function PatientProfileActions({ patientId, patientName, className }: PatientProfileActionsProps) {
  const router = useRouter();
  const [queueOpen, setQueueOpen] = useState(false);
  const { openBookingDialog, lastSuccessNonce } = useBookAppointmentStore();
  const initialNonce = useRef(lastSuccessNonce);

  useEffect(() => {
    if (lastSuccessNonce !== initialNonce.current) router.refresh();
  }, [lastSuccessNonce, router]);

  return (
    <>
      <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
        <Button
          onClick={() => setQueueOpen(true)}
          className="h-10 rounded-lg bg-[#caa26a] px-4 font-semibold text-[#2c2e4b] shadow-sm hover:bg-[#b8913e]"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add to doctor&apos;s queue
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            openBookingDialog({
              initialPatientId: patientId,
              source: AppointmentSource.FRONTDESK_SCHEDULED,
              bookingChannel: BookingChannel.DASHBOARD,
            })
          }
          className="h-10 rounded-lg border-[#2c2e4b]/20 bg-white px-4 font-medium text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
        >
          <CalendarPlus className="mr-2 h-4 w-4 text-[#caa26a]" />
          Book appointment
        </Button>
      </div>

      <QuickAssignmentDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        initialPatientId={patientId}
        initialPatientName={patientName}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
