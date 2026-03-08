import Link from 'next/link';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface PatientContextBannerProps {
  patientIdFilter: string;
  filteredAppointments: AppointmentResponseDto[];
}

export function PatientContextBanner({ patientIdFilter, filteredAppointments }: PatientContextBannerProps) {
  const patientNameFromFilter = filteredAppointments.length > 0
    ? `${filteredAppointments[0].patient?.firstName ?? ''} ${filteredAppointments[0].patient?.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
      <Link
        href={`/frontdesk/patient/${patientIdFilter}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patient Profile
      </Link>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserCircle className="h-4 w-4" />
        <span>
          Showing appointments for{' '}
          <span className="font-semibold text-foreground">
            {patientNameFromFilter || 'this patient'}
          </span>
        </span>
      </div>
      <Link
        href="/frontdesk/appointments"
        className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        View all appointments
      </Link>
    </div>
  );
}
