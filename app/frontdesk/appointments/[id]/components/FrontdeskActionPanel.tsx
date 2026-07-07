'use client';

import { Button } from '@/components/ui/button';
import { CalendarClock, UserX, XCircle, User } from 'lucide-react';
import { AppointmentStatus, canCheckIn, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';

interface FrontdeskActionPanelProps {
  status: AppointmentStatus;
  isPastDate: boolean;
  isBusy: boolean;
  isCheckingIn: boolean;
  appointmentId: number;
  patientId: string;
  onCheckIn: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onMarkNoShow?: () => void;
  onViewPatient: () => void;
  onBack: () => void;
}

export function FrontdeskActionPanel({
  status,
  isPastDate,
  isBusy,
  isCheckingIn,
  appointmentId,
  patientId,
  onCheckIn,
  onReschedule,
  onCancel,
  onMarkNoShow,
  onViewPatient,
  onBack,
}: FrontdeskActionPanelProps) {
  const showCheckIn = canCheckIn(status);
  const showAwaitingBanner = isAwaitingConfirmation(status);
  
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

  const hasAnyAction = showCheckIn || canReschedule || canCancel || canMarkNoShow;

  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b]">Actions</div>
      </div>
      <div className="p-4 space-y-2">
        {showAwaitingBanner && (
          <div className="flex items-center gap-2 p-3 bg-[#e7d6bf]/20 text-[#2c2e4b] rounded-lg border border-[#e7d6bf]">
            <CalendarClock className="h-4 w-4 shrink-0 text-[#caa26a]" />
            <p className="text-xs font-medium">
              Awaiting doctor confirmation. Check-in will be available once the doctor confirms this appointment.
            </p>
          </div>
        )}

        {showCheckIn && (
          <Button
            onClick={onCheckIn}
            disabled={isCheckingIn || isBusy}
            className="w-full justify-start rounded-lg text-sm font-medium bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
          >
            {isCheckingIn ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-[#2c2e4b]/30 border-t-[#2c2e4b] animate-spin mr-2" />
                Checking In...
              </>
            ) : (
              <>
                <CheckIcon className="mr-2 h-4 w-4" />
                Check In Patient
              </>
            )}
          </Button>
        )}

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

        <Button
          variant="outline"
          className="w-full justify-start rounded-lg text-sm border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={onViewPatient}
        >
          <User className="mr-2 h-4 w-4 text-[#caa26a]" />
          View Patient Profile
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start rounded-lg text-sm text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
          onClick={onBack}
        >
          Back to Appointments
        </Button>
      </div>
    </div>
  );
}

function CalendarClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
}
