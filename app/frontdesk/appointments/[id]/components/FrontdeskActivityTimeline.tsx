'use client';

import { AppointmentStatus, canCheckIn, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { TimelineItem } from './TimelineItem';
import { formatDistanceToNow } from 'date-fns';
import { ActivityIcon } from './FrontdeskAppointmentDetailsCard';

interface FrontdeskActivityTimelineProps {
  status: AppointmentStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  checkedInAt?: Date | string;
  consultationStartedAt?: Date | string;
  consultationEndedAt?: Date | string;
  isPastDate: boolean;
}

export function FrontdeskActivityTimeline({
  status,
  createdAt,
  updatedAt,
  checkedInAt,
  consultationStartedAt,
  consultationEndedAt,
  isPastDate,
}: FrontdeskActivityTimelineProps) {
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
              label="Awaiting doctor confirmation"
              active
            />
          )}
          {(status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED) && (
            <TimelineItem
              label="Waiting for patient check-in"
              active
            />
          )}
          {canCheckIn(status) && (
            <TimelineItem
              label="Ready for check-in"
              active
            />
          )}
        </div>
      </div>
    </div>
  );
}
