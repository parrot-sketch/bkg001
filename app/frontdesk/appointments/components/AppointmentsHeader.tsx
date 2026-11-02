'use client';

import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { RecordPastVisitDialog } from '@/components/frontdesk/RecordPastVisitDialog';

interface AppointmentsHeaderProps {
  patientIdFilter: string | null;
  patientNameFromFilter: string | null;
  selectedDate?: Date;
  onPastVisitRecorded?: (visitDate: Date) => void;
}

export function AppointmentsHeader({
  patientIdFilter,
  patientNameFromFilter,
  selectedDate,
  onPastVisitRecorded,
}: AppointmentsHeaderProps) {
  const { openBookingDialog } = useBookAppointmentStore();
  const [pastVisitOpen, setPastVisitOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#dddee2] tracking-tight">Appointments</h1>
          <p className="text-sm text-[#dddee2]/60 mt-0.5">
            {patientIdFilter
              ? `Filtered to ${patientNameFromFilter || 'selected patient'}`
              : 'Manage bookings, check-ins, and patient flow'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPastVisitOpen(true)}
            className="border-[#005f73]/40 text-[#dddee2] hover:bg-[#005f73]/20 hover:text-white rounded-lg text-xs font-medium px-4 h-9"
          >
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Record past visit
          </Button>
          <Button
            onClick={() => {
              openBookingDialog({
                initialPatientId: patientIdFilter || undefined,
                source: AppointmentSource.FRONTDESK_SCHEDULED,
                bookingChannel: BookingChannel.DASHBOARD,
              });
            }}
            className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg text-xs font-medium shadow-sm px-4 h-9 transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Appointment
          </Button>
        </div>
      </header>

      <RecordPastVisitDialog
        open={pastVisitOpen}
        onOpenChange={setPastVisitOpen}
        initialPatientId={patientIdFilter}
        initialPatientName={patientNameFromFilter}
        preferredDate={selectedDate}
        onSuccess={onPastVisitRecorded}
      />
    </>
  );
}
