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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
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
        className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm shadow-cyan-200/50 h-10 px-5"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Appointment
      </Button>
    </header>
  );
}
