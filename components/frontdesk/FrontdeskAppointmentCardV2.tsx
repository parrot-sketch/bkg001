'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, ChevronRight, UserCheck, FileText, CalendarPlus, XCircle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentStatus, canCheckIn, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCheckIn } from '@/hooks/frontdesk/useTodaysSchedule';
import { useAppointments } from '@/hooks/useAppointments';
import { frontdeskChargeSheetPath, openFollowUpBooking } from '@/hooks/frontdesk/useBookAppointmentStore';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [AppointmentStatus.PENDING]: { bg: 'bg-[#e7d6bf]/70', text: 'text-[#2c2e4b]', label: 'Pending' },
  [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: { bg: 'bg-[#005f73]/15', text: 'text-[#005f73]', label: 'Awaiting confirmation' },
  [AppointmentStatus.SCHEDULED]: { bg: 'bg-[#e7d6bf]/50', text: 'text-[#2c2e4b]', label: 'Scheduled' },
  [AppointmentStatus.CONFIRMED]: { bg: 'bg-[#e7d6bf]/50', text: 'text-[#2c2e4b]', label: 'Confirmed' },
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/25', text: 'text-[#2c2e4b]', label: 'Checked in' },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/25', text: 'text-[#2c2e4b]', label: 'Ready' },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/35', text: 'text-[#2c2e4b]', label: 'In consultation' },
  [AppointmentStatus.COMPLETED]: { bg: 'bg-[#003b53]/10', text: 'text-[#003b53]', label: 'Completed' },
  [AppointmentStatus.CANCELLED]: { bg: 'bg-[#9b2226]/10', text: 'text-[#9b2226]', label: 'Cancelled' },
  [AppointmentStatus.NO_SHOW]: { bg: 'bg-[#9b2226]/10', text: 'text-[#9b2226]', label: 'No show' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: status };
}

interface FrontdeskAppointmentCardV2Props {
  appointment: AppointmentResponseDto;
  onAction?: (action: string, appointment: AppointmentResponseDto) => void;
  /** Flat row for the appointments day board; default keeps a bordered card elsewhere */
  variant?: 'card' | 'row';
}

export function FrontdeskAppointmentCardV2({
  appointment,
  onAction,
  variant = 'card',
}: FrontdeskAppointmentCardV2Props) {
  const router = useRouter();
  const checkInMutation = useCheckIn();
  const { cancelAppointment, markNoShow } = useAppointments();

  const status = appointment.status;
  const config = getStatusConfig(status);
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown Patient';
  const patientInitials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  const canCheckInAppt = canCheckIn(status as AppointmentStatus);
  const isAwaiting = isAwaitingConfirmation(status as AppointmentStatus);
  const isCompleted = status === AppointmentStatus.COMPLETED;
  const isPast = status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW;

  const handleCheckIn = () => {
    checkInMutation.mutate(
      { appointmentId: appointment.id },
      {
        onSuccess: () => {
          onAction?.('checkin', appointment);
        },
      }
    );
  };

  const handleCancel = () => {
    cancelAppointment(
      { appointmentId: appointment.id },
      {
        onSuccess: () => {
          onAction?.('cancel', appointment);
        },
      }
    );
  };

  const handleNoShow = () => {
    markNoShow(appointment.id, {
      onSuccess: () => {
        onAction?.('noshow', appointment);
      },
    });
  };

  const menuActions = useMemo(() => {
    const items: { label: string; icon: React.ReactNode; action: string; variant?: 'default' | 'destructive' }[] = [];

    items.push({ label: 'View Details', icon: <ChevronRight className="h-4 w-4" />, action: 'details' });

    if (canCheckInAppt) {
      items.push({ label: 'Check In', icon: <UserCheck className="h-4 w-4" />, action: 'checkin' });
    }

    if (isCompleted) {
      items.push({ label: 'Charge Sheet', icon: <FileText className="h-4 w-4" />, action: 'chargesheet' });
    }

    if (isAwaiting) {
      items.push({ label: 'Mark No-Show', icon: <UserX className="h-4 w-4" />, action: 'noshow', variant: 'destructive' });
    }

    if (!isPast && !isCompleted) {
      items.push({ label: 'Schedule Follow-up', icon: <CalendarPlus className="h-4 w-4" />, action: 'followup' });
    }

    if (!isPast && !isCompleted && !isAwaiting) {
      items.push({ label: 'Cancel Appointment', icon: <XCircle className="h-4 w-4" />, action: 'cancel', variant: 'destructive' });
    }

    return items;
  }, [status, canCheckInAppt, isCompleted, isAwaiting, isPast]);

  return (
    <div
      className={cn(
        'group bg-white transition-colors duration-150',
        variant === 'card' &&
          'rounded-md border border-[#e7d6bf] hover:border-[#caa26a]/60',
        variant === 'row' && 'hover:bg-[#e7d6bf]/15',
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex w-14 shrink-0 flex-col items-start pt-1">
            <span className="text-sm font-semibold tabular-nums leading-none text-[#2c2e4b]">
              {appointment.time || '--:--'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e7d6bf] bg-[#e7d6bf]/35">
                  <span className="text-[11px] font-semibold text-[#2c2e4b]">{patientInitials}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h4 className="truncate text-sm font-semibold leading-tight text-[#2c2e4b]">
                    {patientName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-[#2c2e4b]/75">
                    <span className="truncate">{appointment.doctor?.name || 'Unassigned'}</span>
                    {appointment.type ? (
                      <>
                        <span className="text-[#2c2e4b]/35">·</span>
                        <span className="truncate">{appointment.type}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <StatusBadge config={config} />
            </div>

            <div
              className={cn(
                'mt-2.5 flex items-center justify-between gap-2 pt-2.5',
                variant === 'card' ? 'border-t border-[#e7d6bf]' : 'border-t border-[#e7d6bf]/70',
              )}
            >
              <div className="flex items-center gap-2">
                {canCheckInAppt && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending}
                    size="sm"
                    className="h-7 rounded-md bg-[#caa26a] px-3 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
                  >
                    {checkInMutation.isPending ? 'Checking...' : 'Check in'}
                  </Button>
                )}
                {isAwaiting && (
                  <span className="text-[11px] font-medium text-[#005f73]">
                    Awaiting confirmation
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-[#2c2e4b]/55 hover:bg-[#e7d6bf]/40 hover:text-[#2c2e4b]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {menuActions.map((item, index) => (
                    <DropdownMenuItem
                      key={item.action}
                      onClick={() => {
                        if (item.action === 'details') {
                          router.push(`/frontdesk/appointments/${appointment.id}`);
                        } else if (item.action === 'chargesheet') {
                          router.push(frontdeskChargeSheetPath(appointment.patientId, appointment.id));
                        } else if (item.action === 'followup') {
                          openFollowUpBooking({
                            appointmentId: appointment.id,
                            patientId: appointment.patientId,
                            patientName,
                            doctorId: appointment.doctorId,
                            doctorName: appointment.doctor?.name,
                          });
                        } else if (item.action === 'checkin') {
                          handleCheckIn();
                        } else if (item.action === 'cancel') {
                          handleCancel();
                        } else if (item.action === 'noshow') {
                          handleNoShow();
                        } else {
                          onAction?.(item.action, appointment);
                        }
                      }}
                      className={item.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ config }: { config: { bg: string; text: string; label: string } }) {
  return (
    <Badge variant="outline" className={cn('h-6 rounded-md px-2 text-[10px] font-medium border-0', config.text, config.bg)}>
      {config.label}
    </Badge>
  );
}
