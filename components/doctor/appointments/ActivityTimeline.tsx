'use client';

import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { TimelineItem } from '@/components/doctor/appointments/TimelineItem';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTimelineProps {
  status: AppointmentStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  checkedInAt?: Date | string;
  consultationStartedAt?: Date | string;
  consultationEndedAt?: Date | string;
  isPastDate: boolean;
  canStartConsultation: boolean;
  canContinueConsultation: boolean;
  isOverdue: boolean;
}

export function ActivityTimeline({
  status,
  createdAt,
  updatedAt,
  checkedInAt,
  consultationStartedAt,
  consultationEndedAt,
  isPastDate,
  canStartConsultation,
  canContinueConsultation,
  isOverdue,
}: ActivityTimelineProps) {
  const isTerminal = status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW;
  const canMarkNoShow =
    (status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED) &&
    isPastDate;

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-[#caa26a]" />
          Timeline
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-0">
          <TimelineItem
            label="Appointment created"
            time={createdAt}
            done
          />
          {(status !== AppointmentStatus.PENDING && status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) && (
            <TimelineItem
              label="Doctor confirmed"
              time={updatedAt}
              done
            />
          )}
          {checkedInAt && (
            <TimelineItem
              label="Patient checked in"
              time={checkedInAt}
              done
            />
          )}
          {consultationStartedAt && (
            <TimelineItem
              label="Consultation started"
              time={consultationStartedAt}
              done
            />
          )}
          {consultationEndedAt && (
            <TimelineItem
              label="Consultation completed"
              time={consultationEndedAt}
              done
            />
          )}
          {status === AppointmentStatus.CANCELLED && (
            <TimelineItem
              label="Appointment cancelled"
              time={updatedAt}
              done
              variant="destructive"
            />
          )}
          {status === AppointmentStatus.NO_SHOW && (
            <TimelineItem
              label="Marked as no-show"
              time={updatedAt}
              done
              variant="destructive"
            />
          )}
          {isAwaitingConfirmation(status) && (
            <TimelineItem
              label="Awaiting your confirmation"
              active
            />
          )}
          {(status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED) && (
            <TimelineItem
              label="Waiting for patient check-in"
              active
            />
          )}
          {canStartConsultation && (
            <TimelineItem
              label="Ready to begin consultation"
              active
            />
          )}
          {canContinueConsultation && !isOverdue && (
            <TimelineItem
              label="Consultation in progress"
              active
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}
