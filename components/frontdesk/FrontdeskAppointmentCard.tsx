'use client';

/**
 * Frontdesk Appointment Card
 *
 * Presentational card for displaying appointment rows with inline actions.
 * Composes: InlineCheckInPanel, StaleConsultationDialog, and business logic helpers.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useCheckIn } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { InlineCheckInPanel } from './InlineCheckInPanel';
import { StaleConsultationDialog, useStaleConsultationDialog } from './StaleConsultationDialog';
import {
  STATUS_CONFIG,
  isAppointmentOverdue,
  getCheckInEligibility,
  getPatientDisplay,
  isTerminalStatus,
} from '@/lib/utils/appointment-card-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  CalendarClock,
  CheckCircle,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Stethoscope,
  MoreVertical,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────

interface FrontdeskAppointmentCardProps {
  appointment: AppointmentResponseDto;
  isHighlighted?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function FrontdeskAppointmentCard({
  appointment,
  isHighlighted,
}: FrontdeskAppointmentCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeHighlight, setActiveHighlight] = useState(!!isHighlighted);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const staleDialog = useStaleConsultationDialog();
  const checkInMutation = useCheckIn();
  const isCheckingIn = checkInMutation.isPending;

  // Highlight animation on mount/navigation
  useEffect(() => {
    if (isHighlighted) {
      setActiveHighlight(true);
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const t = setTimeout(() => setActiveHighlight(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isHighlighted, appointment.id]);

  // Derived state
  const isOverdue = isAppointmentOverdue(appointment);
  const isStaleConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION && isOverdue;
  const checkInStatus = getCheckInEligibility(appointment);
  const config = STATUS_CONFIG[appointment.status as AppointmentStatus] ?? STATUS_CONFIG[AppointmentStatus.PENDING];
  const StatusIcon = config.icon;
  const { name: patientName, initials: patientInitials } = getPatientDisplay(appointment);
  const isTerminal = isTerminalStatus(appointment.status);

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          'group relative bg-white border rounded-xl overflow-hidden transition-all duration-300',
          checkInOpen
            ? 'border-slate-300 shadow-md ring-1 ring-slate-200'
            : activeHighlight
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200 ring-offset-2 shadow-md'
              : isStaleConsultation
                ? 'border-amber-300 bg-amber-50/30 hover:shadow-sm'
                : isTerminal
                  ? 'border-slate-100 opacity-70 hover:opacity-100'
                  : 'border-slate-200/60 hover:shadow-sm hover:border-slate-300',
        )}
      >
        {/* Main Row */}
        <div className="flex items-stretch min-h-[68px]">
          <div
            className={cn(
              'w-1 shrink-0 transition-colors duration-300',
              checkInOpen ? 'bg-slate-900' : isStaleConsultation ? 'bg-amber-500' : config.bar,
            )}
          />

          <div className="flex flex-1 flex-col sm:flex-row sm:items-center px-3 py-3 gap-3 sm:gap-4">
            {/* Time + type */}
            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 sm:min-w-[72px]">
              <span className="text-base font-bold text-slate-900 leading-tight tabular-nums">
                {appointment.time}
              </span>
              <span className="text-[10px] font-medium text-slate-400 capitalize">
                {appointment.type || 'Consultation'}
              </span>
            </div>

            {/* Patient & Doctor */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border border-slate-200 shrink-0">
                {appointment.patient?.img ? (
                  <img src={appointment.patient.img} alt={patientName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{patientInitials}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 truncate leading-tight">{patientName}</h4>
                <div className="flex items-center text-xs text-slate-400 gap-1.5 mt-0.5">
                  <Stethoscope className="h-3 w-3 shrink-0" />
                  <span className="truncate">{appointment.doctor?.name || 'Unassigned'}</span>
                  {appointment.patient?.fileNumber && (
                    <>
                      <span className="text-slate-200">&bull;</span>
                      <span className="text-[10px] font-mono">{appointment.patient.fileNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status badge — desktop */}
            <div className="hidden sm:flex">
              <StatusBadge config={config} StatusIcon={StatusIcon} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Status badge — mobile */}
              <div className="sm:hidden">
                <StatusBadge config={config} StatusIcon={StatusIcon} />
              </div>

              {/* CTA */}
              <CardCta
                appointment={appointment}
                checkInStatus={checkInStatus}
                isStaleConsultation={isStaleConsultation}
                checkInOpen={checkInOpen}
                isCheckingIn={isCheckingIn}
                onToggleCheckIn={() => setCheckInOpen((v) => !v)}
                onOpenResolveDialog={staleDialog.openDialog}
              />

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
                  <DropdownMenuItem onClick={() => router.push(`/frontdesk/appointments/${appointment.id}`)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {isStaleConsultation && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => staleDialog.openDialog('complete')}
                        className="text-emerald-600 focus:text-emerald-600"
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => staleDialog.openDialog('cancel')}
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

        {/* Inline Check-In Panel */}
        <InlineCheckInPanel
          appointmentId={appointment.id}
          patientName={patientName}
          doctorName={appointment.doctor?.name}
          time={appointment.time}
          isOpen={checkInOpen}
          onToggle={() => setCheckInOpen((v) => !v)}
          checkInMutation={checkInMutation}
        />
      </div>

      {/* Stale Consultation Dialog */}
      <StaleConsultationDialog
        open={staleDialog.open}
        onOpenChange={staleDialog.onOpenChange}
        action={staleDialog.action}
        appointmentId={appointment.id}
        patientName={patientName}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({ config, StatusIcon }: { config: (typeof STATUS_CONFIG)[AppointmentStatus]; StatusIcon: (typeof config)['icon'] }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-bold py-0.5 px-2.5 border-0 gap-1', config.text, config.bg)}
    >
      <StatusIcon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface CardCtaProps {
  appointment: AppointmentResponseDto;
  checkInStatus: ReturnType<typeof getCheckInEligibility>;
  isStaleConsultation: boolean;
  checkInOpen: boolean;
  isCheckingIn: boolean;
  onToggleCheckIn: () => void;
  onOpenResolveDialog: (action: 'complete' | 'cancel') => void;
}

function CardCta({ appointment, checkInStatus, isStaleConsultation, checkInOpen, isCheckingIn, onToggleCheckIn }: CardCtaProps) {
  // Check-in available
  if (checkInStatus.canCheckIn) {
    return (
      <Button
        onClick={onToggleCheckIn}
        disabled={isCheckingIn}
        size="sm"
        className={cn(
          'h-8 px-3.5 text-xs font-semibold rounded-lg shadow-sm transition-all duration-200',
          checkInOpen
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none'
            : 'bg-slate-900 hover:bg-slate-800 text-white',
        )}
      >
        {checkInOpen ? (
          <><ChevronUp className="mr-1 h-3.5 w-3.5" /> Close</>
        ) : (
          <><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Check In</>
        )}
      </Button>
    );
  }

  // Check-in available for status but blocked by time/date
  if (canCheckIn(appointment.status as AppointmentStatus) && !checkInStatus.canCheckIn) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled size="sm" className="h-8 px-3.5 bg-slate-300 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed">
                <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Check In
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs font-medium">{checkInStatus.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Already checked in / ready
  if (appointment.status === AppointmentStatus.CHECKED_IN || appointment.status === AppointmentStatus.READY_FOR_CONSULTATION) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold whitespace-nowrap">
          {appointment.status === AppointmentStatus.READY_FOR_CONSULTATION ? 'Ready for MD' : 'In Waiting'}
        </span>
      </div>
    );
  }

  // In consultation
  if (appointment.status === AppointmentStatus.IN_CONSULTATION) {
    if (isStaleConsultation) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold whitespace-nowrap">Overdue</span>
        </div>
      );
    }
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span className="text-[10px] font-bold whitespace-nowrap">In Progress</span>
      </div>
    );
  }

  return null;
}
