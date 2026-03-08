import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AppointmentsHeaderProps {
  patientIdFilter: string | null;
  patientNameFromFilter: string | null;
}

export function AppointmentsHeader({ patientIdFilter, patientNameFromFilter }: AppointmentsHeaderProps) {
  const router = useRouter();

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
          if (patientIdFilter) {
            router.push(`/frontdesk/booking?patientId=${patientIdFilter}`);
          } else {
            router.push('/frontdesk/patients?mode=book');
          }
        }}
        className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm shadow-cyan-200/50 h-10 px-5"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Appointment
      </Button>
    </header>
  );
}
