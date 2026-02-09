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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { ConfirmAppointmentDialog } from '@/components/appointments/ConfirmAppointmentDialog';
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
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  accent: string;
}

function getHeroConfig(status: string, isOverdue: boolean, patientName: string): HeroConfig {
  if (status === AppointmentStatus.IN_CONSULTATION && isOverdue) {
    return {
      gradient: 'from-amber-600 to-amber-800',
      icon: AlertTriangle,
      title: 'Consultation Running Overtime',
      subtitle: 'Please complete or continue this session as needed',
      accent: 'amber',
    };
  }

  switch (status) {
    case AppointmentStatus.PENDING:
    case AppointmentStatus.PENDING_DOCTOR_CONFIRMATION:
      return {
        gradient: 'from-indigo-600 to-indigo-800',
        icon: CalendarClock,
        title: 'Appointment Awaiting Your Confirmation',
        subtitle: `${patientName} is waiting for you to confirm or reschedule`,
        accent: 'indigo',
      };
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return {
        gradient: 'from-slate-700 to-slate-900',
        icon: Calendar,
        title: 'Appointment Confirmed',
        subtitle: 'Waiting for patient to arrive and check in at frontdesk',
        accent: 'slate',
      };
    case AppointmentStatus.CHECKED_IN:
    case AppointmentStatus.READY_FOR_CONSULTATION:
      return {
        gradient: 'from-emerald-600 to-emerald-800',
        icon: UserCheck,
        title: 'Patient is Ready',
        subtitle: `${patientName} has checked in and is waiting for you`,
        accent: 'emerald',
      };
    case AppointmentStatus.IN_CONSULTATION:
      return {
        gradient: 'from-violet-600 to-violet-800',
        icon: Stethoscope,
        title: 'Consultation In Progress',
        subtitle: 'Your session is active — continue in the workspace',
        accent: 'violet',
      };
    case AppointmentStatus.COMPLETED:
      return {
        gradient: 'from-slate-500 to-slate-700',
        icon: ClipboardCheck,
        title: 'Consultation Completed',
        subtitle: 'This appointment has been concluded',
        accent: 'slate',
      };
    case AppointmentStatus.CANCELLED:
      return {
        gradient: 'from-red-500 to-red-700',
        icon: Ban,
        title: 'Appointment Cancelled',
        subtitle: 'This appointment was cancelled',
        accent: 'red',
      };
    case AppointmentStatus.NO_SHOW:
      return {
        gradient: 'from-rose-500 to-rose-700',
        icon: UserX,
        title: 'Patient Did Not Show',
        subtitle: 'This appointment was marked as a no-show',
        accent: 'rose',
      };
    default:
      return {
        gradient: 'from-slate-600 to-slate-800',
        icon: Calendar,
        title: 'Appointment Details',
        subtitle: '',
        accent: 'slate',
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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
  const canCancel = canReschedule;
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
    // Navigate to the consultation session page — the session page
    // owns the "start consultation" workflow (shows dialog, calls API).
    router.push(`/doctor/consultations/${appointment.id}/session`);
  };

  const handleGoToConsultation = () => {
    router.push(`/doctor/consultations/${appointment.id}/session`);
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

      {/* ═══ Hero Status Banner ═══ */}
      <div className={cn(
        'relative rounded-2xl overflow-hidden p-6 sm:p-8 text-white shadow-lg',
        `bg-gradient-to-br ${heroConfig.gradient}`
      )}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-6 opacity-[0.08]">
          <HeroIcon className="w-32 h-32" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <HeroIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{heroConfig.title}</h1>
              <p className="text-white/70 text-sm mt-0.5">{heroConfig.subtitle}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge className="bg-white/15 text-white border-white/20 backdrop-blur text-xs">
                  #{appointment.id}
                </Badge>
                <span className="text-xs text-white/60">
                  {isValidDate ? format(appointmentDate, 'EEE, MMM d') : ''} • {appointment.time}
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="shrink-0">
            {canConfirm && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isBusy}
                size="lg"
                className="bg-white text-indigo-700 hover:bg-white/90 font-bold shadow-xl rounded-xl"
              >
                {isConfirming ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-5 w-5" />
                )}
                Confirm Appointment
              </Button>
            )}

            {canStartConsultation && (
              <Button
                onClick={handleStartConsultation}
                size="lg"
                className="bg-white text-emerald-700 hover:bg-white/90 font-bold shadow-xl rounded-xl"
              >
                <Stethoscope className="mr-2 h-5 w-5" />
                Start Consultation
              </Button>
            )}

            {canContinueConsultation && (
              <Button
                onClick={handleGoToConsultation}
                size="lg"
                className={cn(
                  'font-bold shadow-xl rounded-xl',
                  timeStatus.isOverdue
                    ? 'bg-white text-amber-700 hover:bg-white/90'
                    : 'bg-white text-violet-700 hover:bg-white/90'
                )}
              >
                <Play className="mr-2 h-5 w-5" />
                {timeStatus.isOverdue ? 'Complete Session' : 'Continue Session'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Success Banners ═══ */}
      {recentAction.type === 'confirmed' && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in slide-in-from-top text-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Appointment Confirmed</p>
            <p className="text-emerald-600 text-xs">The patient and frontdesk have been notified.</p>
          </div>
        </div>
      )}
      {recentAction.type === 'rescheduled' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-in slide-in-from-top text-sm">
          <CalendarClock className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">Appointment Rescheduled</p>
            <p className="text-blue-600 text-xs">All parties have been notified of the new time.</p>
          </div>
        </div>
      )}
      {recentAction.type === 'cancelled' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top text-sm">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Appointment Cancelled</p>
            <p className="text-red-600 text-xs">The patient and frontdesk have been notified.</p>
          </div>
        </div>
      )}

      {/* ═══ Workflow Stepper ═══ */}
      {!isTerminal && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
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
                        isDone && 'bg-emerald-100 text-emerald-600',
                        isActive && 'bg-slate-900 text-white shadow-md',
                        isFuture && 'bg-slate-100 text-slate-300'
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
                        isDone && 'text-emerald-600',
                        isActive && 'text-slate-900',
                        isFuture && 'text-slate-300'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-px mx-2 min-w-[16px]',
                        isDone ? 'bg-emerald-300' : 'bg-slate-200'
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
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
          <p className="text-blue-700 font-medium">
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
          <Card className="border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-slate-100 shadow-sm">
                  <AvatarImage src={appointment.patient?.img ?? undefined} />
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-lg font-bold">
                    {patientInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{patientName}</h3>
                  {appointment.patient?.fileNumber && (
                    <p className="text-xs text-slate-400 font-mono">File #{appointment.patient.fileNumber}</p>
                  )}
                  {appointment.patient?.dateOfBirth && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear()} years old
                      {appointment.patient.gender ? ` • ${appointment.patient.gender}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {appointment.patient?.email && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{appointment.patient.email}</span>
                  </div>
                )}
                {appointment.patient?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{appointment.patient.phone}</span>
                  </div>
                )}
                {appointment.patient?.allergies && (
                  <div className="flex items-start gap-2.5 text-sm text-red-600 col-span-full">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span><strong>Allergies:</strong> {appointment.patient.allergies}</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl text-sm font-medium"
                onClick={() => router.push(`/doctor/patients/${appointment.patientId}`)}
              >
                View Full Patient Record
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Notes / Reason */}
          {(appointment.note || appointment.reason) && (
            <Card className="border-slate-200/60 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointment.reason && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</p>
                    <p className="text-sm text-slate-700">{appointment.reason}</p>
                  </div>
                )}
                {appointment.note && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{appointment.note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Details + Actions (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Appointment Details */}
          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Secondary Actions */}
          {(canReschedule || canCancel || canMarkNoShow) && (
            <Card className="border-slate-200/60 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-700">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {canReschedule && (
                  <Button
                    onClick={() => setShowRescheduleDialog(true)}
                    variant="outline"
                    className="w-full justify-start rounded-xl text-sm"
                    disabled={isBusy}
                  >
                    <CalendarClock className="mr-2 h-4 w-4 text-slate-500" />
                    Reschedule
                  </Button>
                )}

                {canMarkNoShow && (
                  <Button
                    onClick={() => {/* TODO: Mark no-show */ }}
                    variant="outline"
                    className="w-full justify-start rounded-xl text-sm"
                    disabled={isBusy}
                  >
                    <UserX className="mr-2 h-4 w-4 text-slate-500" />
                    Mark No-Show
                  </Button>
                )}

                {canCancel && (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="outline"
                    className="w-full justify-start rounded-xl text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={isBusy}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Appointment
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <Activity className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Dialogs ═══ */}
      <ConfirmAppointmentDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        appointmentId={appointment.id}
        onSuccess={() => {
          setRecentAction({ type: 'confirmed', timestamp: Date.now() });
          refetch();
        }}
      />

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
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value}</p>
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
            done && variant === 'destructive' && 'bg-red-500',
            done && !variant && 'bg-emerald-500',
            active && 'bg-amber-400 animate-pulse',
            !done && !active && 'bg-slate-200'
          )}
        />
        <div className="w-px flex-1 bg-slate-100 mt-1" />
      </div>
      <div className="min-w-0 pb-1">
        <p className={cn(
          'text-xs font-medium',
          done && variant === 'destructive' && 'text-red-700',
          done && !variant && 'text-slate-700',
          active && 'text-amber-700',
          !done && !active && 'text-slate-400'
        )}>
          {label}
        </p>
        {timeStr && (
          <p className="text-[10px] text-slate-400">{timeStr}</p>
        )}
      </div>
    </div>
  );
}
