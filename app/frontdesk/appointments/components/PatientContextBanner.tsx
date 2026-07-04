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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#e7d6bf]/15 border border-[#e7d6bf]">
      <Link
        href={`/frontdesk/patient/${patientIdFilter}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#caa26a] hover:text-[#b8913e] font-semibold shrink-0 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patient Profile
      </Link>
      <div className="h-4 w-px bg-[#e7d6bf]" />
      <div className="flex items-center gap-1.5 text-sm text-[#2c2e4b]/60">
        <UserCircle className="h-4 w-4" />
        <span>
          Showing appointments for{' '}
          <span className="font-semibold text-[#2c2e4b]">
            {patientNameFromFilter || 'this patient'}
          </span>
        </span>
      </div>
      <Link
        href="/frontdesk/appointments"
        className="ml-auto text-xs text-[#2c2e4b]/60 hover:text-[#2c2e4b] transition-colors"
      >
        View all appointments
      </Link>
    </div>
  );
}
