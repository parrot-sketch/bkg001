'use client';

import { useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { RecordPastVisitDialog } from '@/components/frontdesk/RecordPastVisitDialog';

interface AppointmentsHeaderProps {
  patientIdFilter: string | null;
  patientNameFromFilter: string | null;
  selectedDate: Date;
  onPastVisitRecorded?: (visitDate: Date) => void;
  pastVisitOpen?: boolean;
  onPastVisitOpenChange?: (open: boolean) => void;
}

export function AppointmentsHeader({
  patientIdFilter,
  patientNameFromFilter,
  selectedDate,
  onPastVisitRecorded,
  pastVisitOpen,
  onPastVisitOpenChange,
}: AppointmentsHeaderProps) {
  const { openBookingDialog } = useBookAppointmentStore();
  const [internalPastVisitOpen, setInternalPastVisitOpen] = useState(false);

  const isPastVisitOpen = pastVisitOpen ?? internalPastVisitOpen;
  const setPastVisitOpen = onPastVisitOpenChange ?? setInternalPastVisitOpen;

  const today = startOfDay(new Date());
  const selectedDay = startOfDay(selectedDate);
  const viewingPastDay = isBefore(selectedDay, today);
  const selectedDateLabel = format(selectedDate, 'EEEE, MMM d');

  const openNewAppointment = () => {
    openBookingDialog({
      initialPatientId: patientIdFilter || undefined,
      // Only seed future/today dates into the booking wizard (past dates are late-entry)
      initialDate: viewingPastDay ? undefined : format(selectedDate, 'yyyy-MM-dd'),
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Appointments</h1>
          <p className="mt-1 text-sm text-[#e7d6bf]">
            {patientIdFilter
              ? `Filtered to ${patientNameFromFilter || 'selected patient'}`
              : viewingPastDay
                ? `Viewing ${selectedDateLabel} — record missed visits here, or book a future slot`
                : 'Bookings, check-ins, and the day board'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPastVisitOpen(true)}
            className="h-9 rounded-md border-[#e7d6bf]/40 bg-transparent px-3 text-xs font-medium text-[#e7d6bf] hover:bg-white/10 hover:text-white"
          >
            <ClipboardList className="mr-1.5 h-4 w-4" />
            Record past visit
          </Button>
          <Button
            onClick={openNewAppointment}
            className="h-9 rounded-md bg-[#caa26a] px-4 text-xs font-semibold text-[#2c2e4b] shadow-none hover:bg-[#b8913e]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New appointment
          </Button>
        </div>
      </header>

      <RecordPastVisitDialog
        open={isPastVisitOpen}
        onOpenChange={setPastVisitOpen}
        initialPatientId={patientIdFilter}
        initialPatientName={patientNameFromFilter}
        preferredDate={selectedDate}
        onSuccess={onPastVisitRecorded}
      />
    </>
  );
}
