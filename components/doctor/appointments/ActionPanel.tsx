'use client';

import { Button } from '@/components/ui/button';
import { CalendarClock, UserX, XCircle } from 'lucide-react';
import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';

interface ActionPanelProps {
  status: AppointmentStatus;
  isPastDate: boolean;
  isBusy: boolean;
  onReschedule: () => void;
  onCancel: () => void;
  onMarkNoShow?: () => void;
}

export function ActionPanel({
  status,
  isPastDate,
  isBusy,
  onReschedule,
  onCancel,
  onMarkNoShow,
}: ActionPanelProps) {
  const canReschedule = [
    AppointmentStatus.PENDING,
    AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
  ].includes(status);
  
  const canCancel = isAwaitingConfirmation(status);
  const canMarkNoShow =
    (status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED) &&
    isPastDate;

  if (!canReschedule && !canCancel && !canMarkNoShow) return null;

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b]">Actions</div>
      </div>
      <div className="p-4 space-y-2">
        {canReschedule && (
          <Button
            onClick={onReschedule}
            variant="outline"
            className="w-full justify-start rounded-lg text-sm border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            disabled={isBusy}
          >
            <CalendarClock className="mr-2 h-4 w-4 text-[#caa26a]" />
            Reschedule
          </Button>
        )}

        {canMarkNoShow && (
          <Button
            onClick={onMarkNoShow}
            variant="outline"
            className="w-full justify-start rounded-lg text-sm border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            disabled={isBusy}
          >
            <UserX className="mr-2 h-4 w-4 text-[#caa26a]" />
            Mark No-Show
          </Button>
        )}

        {canCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full justify-start rounded-lg text-sm text-red-700 border-red-200 hover:border-red-300 hover:text-red-800"
            disabled={isBusy}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Appointment
          </Button>
        )}
      </div>
    </div>
  );
}
