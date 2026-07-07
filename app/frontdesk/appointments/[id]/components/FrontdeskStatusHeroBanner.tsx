'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';

interface FrontdeskStatusHeroBannerProps {
  status: AppointmentStatus;
  appointmentId: number;
  time?: string;
  date?: Date;
  onCheckIn?: () => void;
  isCheckingIn?: boolean;
}

export function FrontdeskStatusHeroBanner({
  status,
  appointmentId,
  time,
  date,
  onCheckIn,
  isCheckingIn,
}: FrontdeskStatusHeroBannerProps) {
  const heroConfig = getHeroConfig(status);

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
              <heroConfig.icon className="h-4 w-4 text-[#2c2e4b]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-[#2c2e4b] truncate">
                {heroConfig.title}
              </h1>
              {heroConfig.subtitle ? (
                <p className="text-xs text-[#2c2e4b]/60 mt-0.5 truncate">
                  {heroConfig.subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#2c2e4b]/60">
            <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b]">
              Appointment #{appointmentId}
            </Badge>
            {date && (
              <span className="tabular-nums">
                {format(date, 'EEEE, MMMM d, yyyy')} • {time || '--:--'}
              </span>
            )}
            <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b]">
              {formatStatus(status)}
            </Badge>
          </div>
        </div>

        {canCheckIn(status as AppointmentStatus) && onCheckIn && (
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              onClick={onCheckIn}
              disabled={isCheckingIn}
              className="h-9 rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-medium"
            >
              {isCheckingIn ? (
                <span className="h-4 w-4 rounded-full border-2 border-[#2c2e4b]/30 border-t-[#2c2e4b] animate-spin" />
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Check In Patient
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replaceAll('_', ' ').toLowerCase();
}

function getHeroConfig(status: string) {
  switch (status) {
    case AppointmentStatus.PENDING:
    case AppointmentStatus.PENDING_DOCTOR_CONFIRMATION:
      return {
        icon: ClockIcon,
        title: 'Awaiting Doctor Confirmation',
        subtitle: 'This appointment is pending doctor approval',
      };
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return {
        icon: CalendarIcon,
        title: 'Appointment Confirmed',
        subtitle: 'Waiting for patient to arrive and check in',
      };
    case AppointmentStatus.CHECKED_IN:
    case AppointmentStatus.READY_FOR_CONSULTATION:
      return {
        icon: UserCheckIcon,
        title: 'Patient Checked In',
        subtitle: 'Patient is ready for consultation',
      };
    case AppointmentStatus.IN_CONSULTATION:
      return {
        icon: StethoscopeIcon,
        title: 'Consultation In Progress',
        subtitle: 'Doctor is currently seeing the patient',
      };
    case AppointmentStatus.COMPLETED:
      return {
        icon: ClipboardCheckIcon,
        title: 'Consultation Completed',
        subtitle: 'This appointment has been concluded',
      };
    case AppointmentStatus.CANCELLED:
      return {
        icon: BanIcon,
        title: 'Appointment Cancelled',
        subtitle: 'This appointment was cancelled',
      };
    case AppointmentStatus.NO_SHOW:
      return {
        icon: UserXIcon,
        title: 'Patient Did Not Show',
        subtitle: 'This appointment was marked as a no-show',
      };
    default:
      return {
        icon: CalendarIcon,
        title: 'Appointment Details',
        subtitle: '',
      };
  }
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
}
function StethoscopeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.5-4.5S12 5.765 12 8.25c0 1.327.632 2.508 1.612 3.267m-5.224 0c.98.759 1.612 1.94 1.612 3.267 0 2.485-2.099 4.5-4.5 4.5S.75 18.032.75 15.547c0-1.327.632-2.508 1.612-3.267m5.224 0c.98-.759 1.612-1.94 1.612-3.267 0-2.485 2.099-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 1.327-.632 2.508-1.612 3.267" /></svg>;
}
function UserCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
function ClipboardCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function BanIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
}
function UserXIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
