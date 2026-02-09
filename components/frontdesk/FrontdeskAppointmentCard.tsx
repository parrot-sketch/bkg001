'use client';

/**
 * Frontdesk Appointment Card — Premium Row Component
 * 
 * High-density row-based layout for frontdesk sessions management.
 * Optimized for professional clinical environments with clear status indicators.
 * 
 * Features:
 *   - Color-coded left bar by status
 *   - Patient avatar, name, doctor, type in a single row
 *   - Prominent "Check In" CTA for actionable statuses
 *   - Overdue/stale consultation detection with resolve actions
 *   - Context menu for details, resolve, cancel
 */

import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  MoreVertical,
  User,
  AlertTriangle,
  ExternalLink,
  XCircle,
  CheckCheck,
  Stethoscope,
  CalendarClock,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppointmentStatus, canCheckIn, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FrontdeskAppointmentCardProps {
  appointment: AppointmentResponseDto;
  onCheckIn: (appointment: AppointmentResponseDto) => void;
}

/**
 * Check if an appointment is overdue (past its scheduled time but not completed)
 */
function isAppointmentOverdue(appointment: AppointmentResponseDto): boolean {
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.NO_SHOW
  ) {
    return false;
  }

  const now = new Date();
  const appointmentDate = new Date(appointment.appointmentDate);

  // Parse the time (HH:mm format)
  const [hours, minutes] = appointment.time.split(':').map(Number);
  appointmentDate.setHours(hours, minutes, 0, 0);

  // Add 1 hour buffer
  const overdueThreshold = new Date(appointmentDate.getTime() + 60 * 60 * 1000);

  return now > overdueThreshold;
}

/* ═══ Status Color Config ═══ */

interface StatusConfig {
  bar: string;
  text: string;
  bg: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  [AppointmentStatus.PENDING]: {
    bar: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    label: 'Inquiry',
    icon: Clock,
  },
  [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: {
    bar: 'bg-indigo-400',
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    label: 'Awaiting MD',
    icon: CalendarClock,
  },
  [AppointmentStatus.SCHEDULED]: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    label: 'Scheduled',
    icon: CheckCircle,
  },
  [AppointmentStatus.CONFIRMED]: {
    bar: 'bg-emerald-600',
    text: 'text-emerald-800',
    bg: 'bg-emerald-100',
    label: 'Confirmed',
    icon: CheckCircle,
  },
  [AppointmentStatus.COMPLETED]: {
    bar: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    label: 'Completed',
    icon: CheckCheck,
  },
  [AppointmentStatus.CANCELLED]: {
    bar: 'bg-slate-300',
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    label: 'Cancelled',
    icon: XCircle,
  },
  [AppointmentStatus.NO_SHOW]: {
    bar: 'bg-rose-500',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    label: 'No Show',
    icon: AlertTriangle,
  },
  [AppointmentStatus.CHECKED_IN]: {
    bar: 'bg-sky-500',
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    label: 'Checked In',
    icon: UserCheck,
  },
  [AppointmentStatus.READY_FOR_CONSULTATION]: {
    bar: 'bg-teal-500',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
    label: 'Ready',
    icon: Stethoscope,
  },
  [AppointmentStatus.IN_CONSULTATION]: {
    bar: 'bg-violet-500',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    label: 'In Consultation',
    icon: Stethoscope,
  },
};

export function FrontdeskAppointmentCard({ appointment, onCheckIn }: FrontdeskAppointmentCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveAction, setResolveAction] = useState<'complete' | 'cancel' | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const isOverdue = isAppointmentOverdue(appointment);
  const isStaleConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION && isOverdue;

  const config = STATUS_CONFIG[appointment.status as AppointmentStatus] || STATUS_CONFIG[AppointmentStatus.PENDING];
  const StatusIcon = config.icon;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : appointment.patientId || 'Unknown Patient';

  const patientInitials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  const handleResolve = async (action: 'complete' | 'cancel') => {
    setIsResolving(true);
    try {
      const response = await frontdeskApi.resolveStaleAppointment(appointment.id, action);
      if (response.success) {
        toast.success(
          action === 'complete'
            ? 'Consultation marked as completed'
            : 'Appointment cancelled'
        );
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      } else {
        toast.error(response.error || 'Failed to resolve appointment');
      }
    } catch (error) {
      toast.error('An error occurred while resolving the appointment');
    } finally {
      setIsResolving(false);
      setShowResolveDialog(false);
      setResolveAction(null);
    }
  };

  const openResolveDialog = (action: 'complete' | 'cancel') => {
    setResolveAction(action);
    setShowResolveDialog(true);
  };

  const isTerminal =
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.NO_SHOW;

  return (
    <>
      <div
        className={cn(
          'group relative flex items-stretch bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 min-h-[72px]',
          isStaleConsultation
            ? 'border-amber-300 bg-amber-50/30'
            : isTerminal
              ? 'border-slate-100 opacity-70 hover:opacity-100'
              : 'border-slate-200/60'
        )}
      >
        {/* Visual Status Bar */}
        <div className={cn('w-1', isStaleConsultation ? 'bg-amber-500' : config.bar)} />

        <div className="flex flex-1 flex-col sm:flex-row sm:items-center px-3 py-3 gap-3 sm:gap-4">
          {/* Time Slot Block */}
          <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 sm:min-w-[72px]">
            <span className="text-base font-bold text-slate-900 leading-tight tabular-nums">
              {appointment.time}
            </span>
            <span className="text-[10px] font-medium text-slate-400 capitalize">
              {appointment.type || 'Consultation'}
            </span>
          </div>

          {/* Patient & Doctor Info */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
              {appointment.patient?.img ? (
                <img
                  src={appointment.patient.img}
                  alt={patientName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-slate-400">{patientInitials}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate leading-tight">
                {patientName}
              </h4>
              <div className="flex items-center text-xs text-slate-400 gap-1.5 mt-0.5">
                <Stethoscope className="h-3 w-3 shrink-0" />
                <span className="truncate">{appointment.doctor?.name || 'Unassigned'}</span>
                {appointment.patient?.fileNumber && (
                  <>
                    <span className="text-slate-200">•</span>
                    <span className="text-[10px] font-mono">{appointment.patient.fileNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge (always visible) */}
          <div className="hidden sm:flex">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-bold py-0.5 px-2.5 border-0 gap-1',
                config.text,
                config.bg
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile status badge */}
            <div className="sm:hidden">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold py-0.5 px-2 border-0 gap-1',
                  config.text,
                  config.bg
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>

            {/* CTA */}
            {isAwaitingConfirmation(appointment.status as AppointmentStatus) ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
                    ? 'Awaiting Doctor'
                    : 'Pending'}
                </span>
              </div>
            ) : canCheckIn(appointment.status as AppointmentStatus) ? (
              <Button
                onClick={() => onCheckIn(appointment)}
                size="sm"
                className="h-8 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Check In
              </Button>
            ) : appointment.status === AppointmentStatus.CHECKED_IN ||
              appointment.status === AppointmentStatus.READY_FOR_CONSULTATION ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {appointment.status === AppointmentStatus.READY_FOR_CONSULTATION
                    ? 'Ready for MD'
                    : 'In Waiting'}
                </span>
              </div>
            ) : appointment.status === AppointmentStatus.IN_CONSULTATION ? (
              isStaleConsultation ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold whitespace-nowrap">Overdue</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  <span className="text-[10px] font-bold whitespace-nowrap">In Progress</span>
                </div>
              )
            ) : null}

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-slate-600 sm:opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/frontdesk/appointments/${appointment.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>

                {isStaleConsultation && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openResolveDialog('complete')}
                      className="text-emerald-600 focus:text-emerald-600"
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openResolveDialog('cancel')}
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Resolve Confirmation Dialog */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolveAction === 'complete'
                ? 'Mark Consultation as Completed?'
                : 'Cancel Appointment?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolveAction === 'complete'
                ? `This will mark ${patientName}'s consultation as completed. Use this if the doctor completed the consultation but the system didn't update properly.`
                : `This will cancel ${patientName}'s appointment. Use this if the appointment can no longer proceed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolveAction && handleResolve(resolveAction)}
              disabled={isResolving}
              className={
                resolveAction === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isResolving
                ? 'Processing...'
                : resolveAction === 'complete'
                  ? 'Mark Completed'
                  : 'Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
