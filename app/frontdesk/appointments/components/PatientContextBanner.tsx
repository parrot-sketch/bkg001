import Link from 'next/link';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface PatientContextBannerProps {
  patientIdFilter: string;
  filteredAppointments: AppointmentResponseDto[];
}

export function PatientContextBanner({
  patientIdFilter,
  filteredAppointments,
}: PatientContextBannerProps) {
  const patientNameFromFilter =
    filteredAppointments.length > 0
      ? `${filteredAppointments[0].patient?.firstName ?? ''} ${filteredAppointments[0].patient?.lastName ?? ''}`.trim()
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3 border border-white/15 bg-[#2c2e4b]/55 px-4 py-3">
      <Link
        href={`/frontdesk/patient/${patientIdFilter}`}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#caa26a] transition-colors hover:text-[#ee9b00]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient profile
      </Link>
      <div className="hidden h-4 w-px bg-white/20 sm:block" />
      <div className="flex items-center gap-1.5 text-sm text-[#e7d6bf]">
        <UserCircle className="h-4 w-4" />
        <span>
          Showing appointments for{' '}
          <span className="font-semibold text-white">
            {patientNameFromFilter || 'this patient'}
          </span>
        </span>
      </div>
      <Link
        href="/frontdesk/appointments"
        className="ml-auto text-xs font-medium text-[#e7d6bf] transition-colors hover:text-white"
      >
        View all appointments
      </Link>
    </div>
  );
}
