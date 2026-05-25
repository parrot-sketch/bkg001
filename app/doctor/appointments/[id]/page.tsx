'use client';

/**
 * Doctor Appointment Detail Page — Premium Redesign
 * 
 * Status-driven layout that guides the doctor through the appointment lifecycle:
 * 
 *   PENDING_DOCTOR_CONFIRMATION → Confirm / Reschedule / Cancel
 *   SCHEDULED                   → Waiting for patient check-in
 *   CHECKED_IN                  → Start Consultation (primary CTA)
 *   IN_CONSULTATION             → Continue / Go to workspace
 *   COMPLETED                   → Read-only summary
 *   CANCELLED / NO_SHOW         → Terminal, read-only
 * 
 * Design: Hero status banner → Workflow stepper → Patient + Details → Timeline
 */

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  CalendarClock,
  Stethoscope,
  UserX,
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Play,
  ChevronRight,
  MapPin,
  Activity,
  UserCheck,
  ClipboardCheck,
  CircleDot,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { RescheduleDialog } from '@/components/appointments/RescheduleDialog';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { cn } from '@/lib/utils';
// doctorApi removed — consultation start is handled by the session page
import { useAuth } from '@/hooks/patient/useAuth';

interface PageProps {
  params: Promise<{ id: string }>;
}

/* ═══════════════════ Workflow Step Config ═══════════════════ */

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'booked', label: 'Booked', icon: Calendar },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'checked_in', label: 'Checked In', icon: UserCheck },
  { key: 'in_consultation', label: 'Consultation', icon: Stethoscope },
  { key: 'completed', label: 'Completed', icon: ClipboardCheck },
];

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
      return -1; // terminal — special display
    default:
      return 0;
  }
}

/* ═══════════════════ Status Hero Config ═══════════════════ */

interface HeroConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}

function getHeroConfig(status: string, isOverdue: boolean, patientName: string): HeroConfig {
  if (status === AppointmentStatus.IN_CONSULTATION && isOverdue) {
    return {
      icon: AlertTriangle,
      title: 'Consultation Running Overtime',
      subtitle: 'Please complete or continue this session as needed',
    };
  }

  switch (status) {
    case AppointmentStatus.PENDING:
    case AppointmentStatus.PENDING_DOCTOR_CONFIRMATION:
      return {
        icon: CalendarClock,
        title: 'Appointment Awaiting Your Confirmation',
        subtitle: `${patientName} is waiting for you to confirm or reschedule`,
      };
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return {
        icon: Calendar,
        title: 'Appointment Confirmed',
        subtitle: 'Waiting for patient to arrive and check in at frontdesk',
      };
    case AppointmentStatus.CHECKED_IN:
    case AppointmentStatus.READY_FOR_CONSULTATION:
      return {
        icon: UserCheck,
        title: 'Patient is Ready',
        subtitle: `${patientName} has checked in and is waiting for you`,
      };
    case AppointmentStatus.IN_CONSULTATION:
      return {
        icon: Stethoscope,
        title: 'Consultation In Progress',
        subtitle: 'Your session is active — continue in the workspace',
      };
    case AppointmentStatus.COMPLETED:
      return {
        icon: ClipboardCheck,
        title: 'Consultation Completed',
        subtitle: 'This appointment has been concluded',
      };
    case AppointmentStatus.CANCELLED:
      return {
        icon: Ban,
        title: 'Appointment Cancelled',
        subtitle: 'This appointment was cancelled',
      };
    case AppointmentStatus.NO_SHOW:
      return {
        icon: UserX,
        title: 'Patient Did Not Show',
        subtitle: 'This appointment was marked as a no-show',
      };
    default:
      return {
        icon: Calendar,
        title: 'Appointment Details',
        subtitle: '',
      };
  }
}

/* ═══════════════════ Page Component ═══════════════════ */

export default function AppointmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = parseInt(resolvedParams.id);
  const router = useRouter();
  const { user } = useAuth();

  const { appointment, isLoading, error, refetch } = useAppointment(appointmentId);
  const { isConfirming, isRescheduling, isCancelling } = useAppointments();

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Track recent actions for success feedback
  const [recentAction, setRecentAction] = useState<{
    type: 'confirmed' | 'rescheduled' | 'cancelled' | null;
    timestamp: number;
  }>({ type: null, timestamp: 0 });

  useEffect(() => {
    if (recentAction.type) {
      const timer = setTimeout(() => setRecentAction({ type: null, timestamp: 0 }), 5000);
      return () => clearTimeout(timer);
    }
  }, [recentAction.type]);

  // Time-aware status calculation
  const timeStatus = useMemo(() => {
    if (!appointment) return { isAppointmentToday: false, isOverdue: false, isPastDate: false };

    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const isAppointmentToday = isToday(appointmentDate);

    let slotEndTime: Date | null = null;
    if (appointment.time && isAppointmentToday) {
      const [hours, minutes] = appointment.time.split(':').map(Number);
      slotEndTime = new Date(appointmentDate);
      slotEndTime.setHours(hours, minutes + 30, 0, 0);
    }

    const isOverdue = slotEndTime ? now > slotEndTime : false;
    const isPastDate = !isAppointmentToday && isPast(appointmentDate);

    return { isAppointmentToday, isOverdue, isPastDate, slotEndTime };
  }, [appointment?.appointmentDate, appointment?.time]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-slate-300 mx-auto" />
          <p className="text-sm text-slate-400">Loading appointment...</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !appointment) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Appointment Not Found</h3>
          <p className="text-sm text-slate-500">
            This appointment doesn't exist or you don't have access.
          </p>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  /* ── Derived State ── */
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown Patient';

  const patientInitials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  const appointmentDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate)
    : new Date();
  const isValidDate = !isNaN(appointmentDate.getTime());

  const status = appointment.status as AppointmentStatus;
  const activeStep = getActiveStep(status);
  const isTerminal = status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW;

  // Action permissions
  const canConfirm = isAwaitingConfirmation(status);
  const canReschedule = [
    AppointmentStatus.PENDING,
    AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
  ].includes(status);
  // Cancel in this UI uses the doctor "reject" path, which is valid only while awaiting confirmation.
  const canCancel = isAwaitingConfirmation(status);
  const canStartConsultation =
    status === AppointmentStatus.CHECKED_IN ||
    status === AppointmentStatus.READY_FOR_CONSULTATION;
  const canContinueConsultation = status === AppointmentStatus.IN_CONSULTATION;
  const canMarkNoShow =
    (status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED) &&
    timeStatus.isPastDate;

  const heroConfig = getHeroConfig(status, timeStatus.isOverdue, patientName);
  const HeroIcon = heroConfig.icon;

  /* ── Handlers ── */
  const handleStartConsultation = () => {
    router.push(`/doctor/consultations/session/${appointment.id}`);
  };

  const handleGoToConsultation = () => {
    router.push(`/doctor/consultations/session/${appointment.id}`);
  };

  const handleConfirm = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', notes: '' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Appointment confirmed');
        setRecentAction({ type: 'confirmed', timestamp: Date.now() });
        refetch();
      } else {
        toast.error(result.error || 'Failed to confirm');
      }
    } catch (error) {
      toast.error('Error confirming appointment');
    }
  };

  const isBusy = isConfirming || isRescheduling || isCancelling;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* ═══ Back button ═══ */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-slate-500 hover:text-slate-700 -ml-2 rounded-lg"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </Button>

      <div className="border border-border bg-background">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 border border-border bg-muted/30 flex items-center justify-center">
                <HeroIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground truncate">
                  {heroConfig.title}
                </h1>
                {heroConfig.subtitle ? (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {heroConfig.subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-none text-xs">
                Appointment #{appointment.id}
              </Badge>
              <span className="tabular-nums">
                {isValidDate ? format(appointmentDate, 'EEE, MMM d') : 'Date'} • {appointment.time || '--:--'}
              </span>
              <Badge variant="outline" className="rounded-none text-xs">
                {status.replaceAll('_', ' ').toLowerCase()}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {canConfirm && (
              <Button onClick={handleConfirm} disabled={isBusy} className="h-9 rounded-none">
                {isConfirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Confirm
              </Button>
            )}
            {canStartConsultation && (
              <Button onClick={handleStartConsultation} disabled={isBusy} className="h-9 rounded-none">
                <Stethoscope className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
            {canContinueConsultation && (
              <Button onClick={handleGoToConsultation} disabled={isBusy} className="h-9 rounded-none">
                <Play className="mr-2 h-4 w-4" />
                {timeStatus.isOverdue ? 'Complete' : 'Continue'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {recentAction.type && (
        <div className="border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium text-foreground">
              {recentAction.type === 'confirmed'
                ? 'Appointment confirmed'
                : recentAction.type === 'rescheduled'
                  ? 'Appointment rescheduled'
                  : 'Appointment cancelled'}
            </p>
          </div>
        </div>
      )}

      {/* ═══ Workflow Stepper ═══ */}
      {!isTerminal && (
        <div className="border border-border bg-background p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {WORKFLOW_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === activeStep;
              const isDone = index < activeStep;
              const isFuture = index > activeStep;

              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                        isDone && 'bg-muted text-foreground',
                        isActive && 'bg-foreground text-background',
                        isFuture && 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold text-center leading-tight',
                        isDone && 'text-foreground',
                        isActive && 'text-foreground',
                        isFuture && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-px mx-2 min-w-[16px]',
                        isDone ? 'bg-foreground/30' : 'bg-border'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Processing Overlay ═══ */}
      {isBusy && (
        <div className="flex items-center gap-3 p-4 border border-border bg-muted/30 text-sm">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          <p className="text-foreground font-medium">
            {isConfirming && 'Confirming appointment...'}
            {isRescheduling && 'Rescheduling appointment...'}
            {isCancelling && 'Cancelling appointment...'}
          </p>
        </div>
      )}

      {/* ═══ Content Grid ═══ */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Patient Card (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          <div className="border border-border bg-background">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Patient
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 rounded-md border border-border">
                  <AvatarImage src={appointment.patient?.img ?? undefined} />
                  <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-sm font-semibold">
                    {patientInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">{patientName}</h3>
                  {appointment.patient?.fileNumber && (
                    <p className="text-xs text-muted-foreground font-mono">File #{appointment.patient.fileNumber}</p>
                  )}
                  {appointment.patient?.dateOfBirth && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear()} years old
                      {appointment.patient.gender ? ` • ${appointment.patient.gender}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {appointment.patient?.email && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{appointment.patient.email}</span>
                  </div>
                )}
                {appointment.patient?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{appointment.patient.phone}</span>
                  </div>
                )}
                {appointment.patient?.allergies && (
                  <div className="flex items-start gap-2.5 text-sm text-destructive col-span-full">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span><strong>Allergies:</strong> {appointment.patient.allergies}</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full rounded-none text-sm font-medium"
                onClick={() => router.push(`/doctor/patients/${appointment.patientId}`)}
              >
                View Full Patient Record
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notes / Reason */}
          {(appointment.note || appointment.reason) && (
            <div className="border border-border bg-background">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notes
                </div>
              </div>
              <div className="p-4">
                {appointment.reason && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reason for Visit</p>
                    <p className="text-sm text-foreground">{appointment.reason}</p>
                  </div>
                )}
                {appointment.note && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{appointment.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details + Actions (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Appointment Details */}
          <div className="border border-border bg-background">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Details
              </div>
            </div>
            <div className="p-4 space-y-4">
              <DetailRow
                icon={Calendar}
                label="Date"
                value={isValidDate ? format(appointmentDate, 'EEEE, MMMM d, yyyy') : 'Not available'}
              />
              <DetailRow
                icon={Clock}
                label="Time"
                value={appointment.time || 'Not specified'}
              />
              <DetailRow
                icon={Stethoscope}
                label="Type"
                value={appointment.type || 'Consultation'}
              />
              {appointment.checkedInAt && (
                <DetailRow
                  icon={UserCheck}
                  label="Checked In"
                  value={format(new Date(appointment.checkedInAt), 'h:mm a')}
                />
              )}
              {appointment.consultationStartedAt && (
                <DetailRow
                  icon={Activity}
                  label="Consult Started"
                  value={format(new Date(appointment.consultationStartedAt), 'h:mm a')}
                />
              )}
              {appointment.consultationEndedAt && (
                <DetailRow
                  icon={ClipboardCheck}
                  label="Consult Ended"
                  value={format(new Date(appointment.consultationEndedAt), 'h:mm a')}
                />
              )}
              {appointment.consultationDuration && (
                <DetailRow
                  icon={Clock}
                  label="Duration"
                  value={`${appointment.consultationDuration} min`}
                />
              )}
            </div>
          </div>

          {/* Secondary Actions */}
          {(canReschedule || canCancel || canMarkNoShow) && (
            <div className="border border-border bg-background">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold text-foreground">Actions</div>
              </div>
              <div className="p-4 space-y-2">
                {canReschedule && (
                  <Button
                    onClick={() => setShowRescheduleDialog(true)}
                    variant="outline"
                    className="w-full justify-start rounded-none text-sm"
                    disabled={isBusy}
                  >
                    <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
                    Reschedule
                  </Button>
                )}

                {canMarkNoShow && (
                  <Button
                    onClick={() => {/* TODO: Mark no-show */ }}
                    variant="outline"
                    className="w-full justify-start rounded-none text-sm"
                    disabled={isBusy}
                  >
                    <UserX className="mr-2 h-4 w-4 text-muted-foreground" />
                    Mark No-Show
                  </Button>
                )}

                {canCancel && (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="outline"
                    className="w-full justify-start rounded-none text-sm text-destructive border-destructive/30 hover:border-destructive/50 hover:text-destructive"
                    disabled={isBusy}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Appointment
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="border border-border bg-background">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Timeline
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-0">
                <TimelineItem
                  label="Appointment created"
                  time={appointment.createdAt}
                  done
                />
                {(status !== AppointmentStatus.PENDING && status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) && (
                  <TimelineItem
                    label="Doctor confirmed"
                    time={appointment.updatedAt}
                    done
                  />
                )}
                {appointment.checkedInAt && (
                  <TimelineItem
                    label="Patient checked in"
                    time={appointment.checkedInAt}
                    done
                  />
                )}
                {appointment.consultationStartedAt && (
                  <TimelineItem
                    label="Consultation started"
                    time={appointment.consultationStartedAt}
                    done
                  />
                )}
                {appointment.consultationEndedAt && (
                  <TimelineItem
                    label="Consultation completed"
                    time={appointment.consultationEndedAt}
                    done
                  />
                )}
                {status === AppointmentStatus.CANCELLED && (
                  <TimelineItem
                    label="Appointment cancelled"
                    time={appointment.updatedAt}
                    done
                    variant="destructive"
                  />
                )}
                {status === AppointmentStatus.NO_SHOW && (
                  <TimelineItem
                    label="Marked as no-show"
                    time={appointment.updatedAt}
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
                {canContinueConsultation && !timeStatus.isOverdue && (
                  <TimelineItem
                    label="Consultation in progress"
                    active
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

       {/* ═══ Dialogs ═══ */}
       <RescheduleDialog
         open={showRescheduleDialog}
         onOpenChange={setShowRescheduleDialog}
         appointment={appointment}
         onSuccess={() => {
           setRecentAction({ type: 'rescheduled', timestamp: Date.now() });
           refetch();
         }}
       />

       <CancelAppointmentDialog
         open={showCancelDialog}
         onOpenChange={setShowCancelDialog}
         appointmentId={appointment.id}
         onSuccess={() => {
           setRecentAction({ type: 'cancelled', timestamp: Date.now() });
           refetch();
         }}
       />
    </div>
  );
}

/* ═══════════════════ Sub-Components ═══════════════════ */

/** Detail row */
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium">{value}</p>
      </div>
    </div>
  );
}

/** Timeline item */
function TimelineItem({
  label,
  time,
  done,
  active,
  variant,
}: {
  label: string;
  time?: Date | string;
  done?: boolean;
  active?: boolean;
  variant?: 'destructive';
}) {
  const timeStr = time && !isNaN(new Date(time).getTime())
    ? formatDistanceToNow(new Date(time), { addSuffix: true })
    : null;

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full mt-1',
            done && variant === 'destructive' && 'bg-destructive',
            done && !variant && 'bg-foreground/60',
            active && 'bg-foreground animate-pulse',
            !done && !active && 'bg-border'
          )}
        />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="min-w-0 pb-1">
        <p className={cn(
          'text-xs font-medium',
          done && variant === 'destructive' && 'text-destructive',
          done && !variant && 'text-foreground',
          active && 'text-foreground',
          !done && !active && 'text-muted-foreground'
        )}>
          {label}
        </p>
        {timeStr && (
          <p className="text-[10px] text-muted-foreground">{timeStr}</p>
        )}
      </div>
    </div>
  );
}
