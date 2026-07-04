import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

interface AppointmentsHeaderProps {
  patientIdFilter: string | null;
  patientNameFromFilter: string | null;
}

export function AppointmentsHeader({ patientIdFilter, patientNameFromFilter }: AppointmentsHeaderProps) {
  const router = useRouter();
  const { openBookingDialog } = useBookAppointmentStore();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#dddee2] tracking-tight">Appointments</h1>
        <p className="text-sm text-[#dddee2]/60 mt-0.5">
          {patientIdFilter
            ? `Filtered to ${patientNameFromFilter || 'selected patient'}`
            : 'Manage bookings, check-ins, and patient flow'}
        </p>
      </div>
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
    </header>
  );
}
