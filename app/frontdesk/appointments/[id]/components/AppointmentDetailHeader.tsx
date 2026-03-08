import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface AppointmentDetailHeaderProps {
  id: number;
  status: string;
}

export function AppointmentDetailHeader({ id, status }: AppointmentDetailHeaderProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      PENDING_DOCTOR_CONFIRMATION: 'bg-blue-100 text-blue-800 border-blue-200',
      CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      SCHEDULED: 'bg-violet-100 text-violet-800 border-violet-200',
      CHECKED_IN: 'bg-teal-100 text-teal-800 border-teal-200',
      IN_CONSULTATION: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      NO_SHOW: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PENDING_DOCTOR_CONFIRMATION: 'Awaiting Confirmation',
      CONFIRMED: 'Confirmed',
      SCHEDULED: 'Scheduled',
      CHECKED_IN: 'Checked In',
      READY_FOR_CONSULTATION: 'Ready',
      IN_CONSULTATION: 'In Consultation',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Appointment #{id}
          </h1>
          <p className="text-slate-500">View appointment details</p>
        </div>
      </div>
      <Badge className={getStatusColor(status)}>
        {getStatusLabel(status)}
      </Badge>
    </div>
  );
}
