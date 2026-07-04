'use client';

import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';

interface WorkflowStepperProps {
  status: AppointmentStatus;
  isTerminal: boolean;
}

const STEPS = [
  { key: 'booked', label: 'Booked', icon: CalendarIcon },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
  { key: 'checked_in', label: 'Checked In', icon: UserCheckIcon },
  { key: 'in_consultation', label: 'Consultation', icon: StethoscopeIcon },
  { key: 'completed', label: 'Completed', icon: ClipboardCheckIcon },
] as const;

export function WorkflowStepper({ status, isTerminal }: WorkflowStepperProps) {
  const activeStep = getActiveStep(status);

  if (isTerminal) return null;

  return (
    <div className="border border-[#e7d6bf] bg-white p-4">
      <div className="flex items-center justify-between overflow-x-auto gap-1">
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isDone = index < activeStep;
          const isFuture = index > activeStep;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                    isDone && 'bg-[#e7d6bf] text-[#2c2e4b]',
                    isActive && 'bg-[#2c2e4b] text-white',
                    isFuture && 'bg-[#e7d6bf]/50 text-[#2c2e4b]/50'
                  )}
                >
                  {isDone ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold text-center leading-tight',
                    isDone && 'text-[#2c2e4b]',
                    isActive && 'text-[#2c2e4b]',
                    isFuture && 'text-[#2c2e4b]/50'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-2 min-w-[16px]',
                    isDone ? 'bg-[#2c2e4b]/30' : 'bg-[#e7d6bf]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getActiveStep(status: string): number {
  switch (status) {
    case AppointmentStatus.PENDING:
    case AppointmentStatus.PENDING_DOCTOR_CONFIRMATION:
      return 0;
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return 1;
    case AppointmentStatus.CHECKED_IN:
    case AppointmentStatus.READY_FOR_CONSULTATION:
      return 2;
    case AppointmentStatus.IN_CONSULTATION:
      return 3;
    case AppointmentStatus.COMPLETED:
      return 4;
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return -1;
    default:
      return 0;
  }
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 015.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function UserCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
function StethoscopeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.5-4.5S12 5.765 12 8.25c0 1.327.632 2.508 1.612 3.267m-5.224 0c.98.759 1.612 1.94 1.612 3.267 0 2.485-2.099 4.5-4.5 4.5S.75 18.032.75 15.547c0-1.327.632-2.508 1.612-3.267m5.224 0c.98-.759 1.612-1.94 1.612-3.267 0-2.485 2.099-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 1.327-.632 2.508-1.612 3.267" /></svg>;
}
function ClipboardCheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
