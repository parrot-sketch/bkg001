'use client';

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
  ChevronUp,
  MoreVertical,
  ExternalLink,
  CheckCheck,
  XCircle,
} from 'lucide-react';

interface FrontdeskAppointmentCardProps {
  appointment: AppointmentResponseDto;
  isHighlighted?: boolean;
}

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

  useEffect(() => {
    if (isHighlighted) {
      setActiveHighlight(true);
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const t = setTimeout(() => setActiveHighlight(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isHighlighted, appointment.id]);

  const isOverdue = isAppointmentOverdue(appointment);
  const isStaleConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION && isOverdue;
  const checkInStatus = getCheckInEligibility(appointment);
  const config = STATUS_CONFIG[appointment.status as AppointmentStatus] ?? STATUS_CONFIG[AppointmentStatus.PENDING];
  const { name: patientName, initials: patientInitials } = getPatientDisplay(appointment);
  const isTerminal = isTerminalStatus(appointment.status);

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          'group relative bg-white border border-slate-200 rounded-lg transition-all duration-200',
          checkInOpen
            ? 'border-slate-300 shadow-sm'
            : activeHighlight
              ? 'border-[#0c5d69] shadow-md bg-slate-50/50'
              : isStaleConsultation
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
        )}
      >
        <div className="px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <span className="text-sm font-semibold text-[#121c1d] leading-none tabular-nums">
                {appointment.time}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">{patientInitials}</span>
                  </div>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <h4 className="text-sm font-medium text-[#121c1d] truncate leading-tight">{patientName}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="truncate">{appointment.doctor?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge config={config} />
              </div>

              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
                <CardCta
                  appointment={appointment}
                  checkInStatus={checkInStatus}
                  isStaleConsultation={isStaleConsultation}
                  checkInOpen={checkInOpen}
                  isCheckingIn={isCheckingIn}
                  onToggleCheckIn={() => setCheckInOpen((v) => !v)}
                  onOpenResolveDialog={staleDialog.openDialog}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
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
        </div>

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

function StatusBadge({ config }: { config: (typeof STATUS_CONFIG)[AppointmentStatus] }) {
  return (
    <Badge
      variant="outline"
      className={cn('h-6 rounded-md px-2 text-[10px] font-medium border-0', config.text, config.bg)}
    >
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
  if (checkInStatus.canCheckIn) {
    return (
      <Button
        onClick={onToggleCheckIn}
        disabled={isCheckingIn}
        size="sm"
        className={cn(
          'h-7 px-3 text-xs font-medium rounded-md transition-colors',
          checkInOpen
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            : 'bg-[#0c5d69] text-white hover:bg-[#0a4f59]',
        )}
      >
        {checkInOpen ? 'Close' : 'Check In'}
      </Button>
    );
  }

  if (canCheckIn(appointment.status as AppointmentStatus) && !checkInStatus.canCheckIn) {
    return (
      <Button disabled size="sm" className="h-7 px-3 bg-slate-100 text-slate-400 text-xs font-medium rounded-md cursor-not-allowed">
        Check In
      </Button>
    );
  }

  if (appointment.status === AppointmentStatus.CHECKED_IN || appointment.status === AppointmentStatus.READY_FOR_CONSULTATION) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0c5d69]" />
        <span className="text-[10px] font-medium">
          {appointment.status === AppointmentStatus.READY_FOR_CONSULTATION ? 'Ready for MD' : 'In Waiting'}
        </span>
      </span>
    );
  }

  if (appointment.status === AppointmentStatus.IN_CONSULTATION) {
    if (isStaleConsultation) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[10px] font-medium">Overdue</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
        <span className="text-[10px] font-medium">In Progress</span>
      </span>
    );
  }

  return null;
}
