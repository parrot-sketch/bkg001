'use client';

import { DetailRow } from '@/components/doctor/appointments/DetailRow';
import { format } from 'date-fns';

interface AppointmentDetailsCardProps {
  appointmentDate: Date;
  time?: string;
  type?: string;
  checkedInAt?: Date | string;
  consultationStartedAt?: Date | string;
  consultationEndedAt?: Date | string;
  consultationDuration?: number;
}

export function AppointmentDetailsCard({
  appointmentDate,
  time,
  type,
  checkedInAt,
  consultationStartedAt,
  consultationEndedAt,
  consultationDuration,
}: AppointmentDetailsCardProps) {
  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <CalendarClockIcon className="h-4 w-4 text-[#caa26a]" />
          Appointment Details
        </div>
      </div>
      <div className="p-4 space-y-4">
        <DetailRow
          icon={CalendarIcon}
          label="Date"
          value={format(appointmentDate, 'EEEE, MMMM d, yyyy')}
        />
        <DetailRow
          icon={ClockIcon}
          label="Time"
          value={time || 'Not specified'}
        />
        <DetailRow
          icon={StethoscopeIcon}
          label="Type"
          value={type || 'Consultation'}
        />
        {checkedInAt && (
          <DetailRow
            icon={UserCheckIcon}
            label="Checked In"
            value={format(new Date(checkedInAt), 'h:mm a')}
          />
        )}
        {consultationStartedAt && (
          <DetailRow
            icon={ActivityIcon}
            label="Consult Started"
            value={format(new Date(consultationStartedAt), 'h:mm a')}
          />
        )}
        {consultationEndedAt && (
          <DetailRow
            icon={ClipboardCheckIcon}
            label="Consult Ended"
            value={format(new Date(consultationEndedAt), 'h:mm a')}
          />
        )}
        {consultationDuration && (
          <DetailRow
            icon={ClockIcon}
            label="Duration"
            value={`${consultationDuration} min`}
          />
        )}
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 015.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function StethoscopeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.5-4.5S12 5.765 12 8.25c0 1.327.632 2.508 1.612 3.267m-5.224 0c.98.759 1.612 1.94 1.612 3.267 0 2.485-2.099 4.5-4.5 4.5S.75 18.032.75 15.547c0-1.327.632-2.508 1.612-3.267m5.224 0c.98-.759 1.612-1.94 1.612-3.267 0-2.485 2.099-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 1.327-.632 2.508-1.612 3.267" /></svg>;
}
function UserCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
function ActivityIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}
function ClipboardCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CalendarClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 015.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
