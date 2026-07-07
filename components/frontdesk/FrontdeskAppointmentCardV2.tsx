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

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [AppointmentStatus.PENDING]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Pending' },
  [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Awaiting Confirmation' },
  [AppointmentStatus.SCHEDULED]: { bg: 'bg-[#e7d6bf]/30', text: 'text-[#2c2e4b]', label: 'Scheduled' },
  [AppointmentStatus.CONFIRMED]: { bg: 'bg-[#e7d6bf]/30', text: 'text-[#2c2e4b]', label: 'Confirmed' },
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Checked In' },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Ready' },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/30', text: 'text-[#2c2e4b]', label: 'In Consultation' },
  [AppointmentStatus.COMPLETED]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Completed' },
  [AppointmentStatus.CANCELLED]: { bg: 'bg-[#e7d6bf]/40', text: 'text-[#2c2e4b]/60', label: 'Cancelled' },
  [AppointmentStatus.NO_SHOW]: { bg: 'bg-[#e7d6bf]/40', text: 'text-[#2c2e4b]/60', label: 'No Show' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: status };
}

interface FrontdeskAppointmentCardV2Props {
  appointment: AppointmentResponseDto;
  onAction?: (action: string, appointment: AppointmentResponseDto) => void;
}

export function FrontdeskAppointmentCardV2({ appointment, onAction }: FrontdeskAppointmentCardV2Props) {
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
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason?.trim()) {
      onAction?.('cancel', appointment);
      return;
    }
    cancelAppointment(
      { appointmentId: appointment.id, reason: reason.trim() },
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
        'group bg-white border border-[#e7d6bf] rounded-lg transition-all duration-200',
        'hover:border-[#caa26a]/50 hover:shadow-sm'
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-1 shrink-0">
            <span className="text-sm font-semibold text-[#2c2e4b] leading-none tabular-nums">
              {appointment.time || '--:--'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-full bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf] shrink-0">
                  <span className="text-[11px] font-semibold text-[#2c2e4b]">{patientInitials}</span>
                </div>
                <div className="flex flex-col min-w-0 gap-0.5">
                  <h4 className="text-sm font-medium text-[#2c2e4b] truncate leading-tight">{patientName}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-[#2c2e4b]/50">
                    <span className="truncate">{appointment.doctor?.name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
              <StatusBadge config={config} />
            </div>

            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#e7d6bf]">
              <div className="flex items-center gap-2">
                {canCheckInAppt && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending}
                    size="sm"
                    className="h-7 px-3 text-xs font-medium rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                  >
                    {checkInMutation.isPending ? 'Checking...' : 'Check In'}
                  </Button>
                )}
                {isAwaiting && (
                  <span className="text-[10px] text-[#caa26a] font-medium">Awaiting confirmation</span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#2c2e4b]/30 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
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
                          router.push(`/frontdesk/appointments/${appointment.id}?tab=billing`);
} else if (item.action === 'followup') {
  router.push(`/frontdesk/appointments/${appointment.id}/followup?patientId=${appointment.patientId}&doctorId=${appointment.doctorId}`);
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
