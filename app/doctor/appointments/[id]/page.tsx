'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { AppointmentStatus, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { RescheduleDialog } from '@/components/appointments/RescheduleDialog';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { useAuth } from '@/hooks/patient/useAuth';
import { cn } from '@/lib/utils';
import {
  StatusHeroBanner,
  WorkflowStepper,
  PatientInfoCard,
  AppointmentDetailsCard,
  NotesSection,
  ActionPanel,
  ActivityTimeline,
} from '@/components/doctor/appointments';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = parseInt(resolvedParams.id);
  const router = useRouter();
  const { user } = useAuth();

  const { appointment, isLoading, error, refetch } = useAppointment(appointmentId);
  const { isConfirming, isRescheduling, isCancelling } = useAppointments();

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
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

  const status = appointment?.status as AppointmentStatus;
  const isTerminal = status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW;
  const canConfirm = isAwaitingConfirmation(status);
  const canStartConsultation =
    status === AppointmentStatus.CHECKED_IN ||
    status === AppointmentStatus.READY_FOR_CONSULTATION;
  const canContinueConsultation = status === AppointmentStatus.IN_CONSULTATION;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#caa26a] mx-auto" />
          <p className="text-sm text-[#2c2e4b]/60">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-[#e7d6bf] flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-[#caa26a]" />
          </div>
          <h3 className="text-lg font-bold text-[#2c2e4b]">Appointment Not Found</h3>
          <p className="text-sm text-[#2c2e4b]/60">
            This appointment doesn't exist or you don't have access.
          </p>
          <Button variant="outline" onClick={() => router.back()} className="rounded-lg border-[#e7d6bf] text-[#2c2e4b]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown Patient';

  const patientInitials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  const appointmentDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate)
    : new Date();

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
    } catch {
      toast.error('Error confirming appointment');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-500">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-[#2c2e4b]/60 hover:text-[#2c2e4b] -ml-2 rounded-lg"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </Button>

      <StatusHeroBanner
        status={status}
        isOverdue={timeStatus.isOverdue}
        patientName={patientName}
        appointmentId={appointment.id}
        time={appointment.time}
        date={appointmentDate}
        onConfirm={canConfirm ? handleConfirm : undefined}
        onStart={canStartConsultation ? () => router.push(`/doctor/consultations/session/${appointment.id}`) : undefined}
        onContinue={canContinueConsultation ? () => router.push(`/doctor/consultations/session/${appointment.id}`) : undefined}
        isConfirming={isConfirming}
        isBusy={isConfirming || isRescheduling || isCancelling}
      />

      {recentAction.type && (
        <div className="border border-[#caa26a]/30 bg-[#e7d6bf]/30 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-[#caa26a] shrink-0" />
            <p className="font-medium text-[#2c2e4b]">
              {recentAction.type === 'confirmed'
                ? 'Appointment confirmed'
                : recentAction.type === 'rescheduled'
                  ? 'Appointment rescheduled'
                  : 'Appointment cancelled'}
            </p>
          </div>
        </div>
      )}

      <WorkflowStepper status={status} isTerminal={isTerminal} />

      {/* Processing Overlay */}
      {(isConfirming || isRescheduling || isCancelling) && (
        <div className="flex items-center gap-3 p-4 border border-[#e7d6bf] bg-[#e7d6bf]/30 text-sm">
          <Loader2 className="h-4 w-4 text-[#caa26a] animate-spin shrink-0" />
          <p className="text-[#2c2e4b] font-medium">
            {isConfirming && 'Confirming appointment...'}
            {isRescheduling && 'Rescheduling appointment...'}
            {isCancelling && 'Cancelling appointment...'}
          </p>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Patient + Notes (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          <PatientInfoCard
            patientName={patientName}
            patientInitials={patientInitials}
            patientImg={appointment.patient?.img}
            fileNumber={appointment.patient?.fileNumber}
            age={appointment.patient?.dateOfBirth ? new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear() : undefined}
            gender={appointment.patient?.gender}
            email={appointment.patient?.email}
            phone={appointment.patient?.phone}
            allergies={appointment.patient?.allergies}
            patientId={appointment.patientId}
            onViewRecord={() => router.push(`/doctor/patients/${appointment.patientId}`)}
          />

          <NotesSection
            reason={appointment.reason}
            note={appointment.note}
          />
        </div>

        {/* Right: Details + Actions + Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <AppointmentDetailsCard
            appointmentDate={appointmentDate}
            time={appointment.time}
            type={appointment.type}
            checkedInAt={appointment.checkedInAt}
            consultationStartedAt={appointment.consultationStartedAt}
            consultationEndedAt={appointment.consultationEndedAt}
            consultationDuration={appointment.consultationDuration}
          />

          <ActionPanel
            status={status}
            isPastDate={timeStatus.isPastDate}
            isBusy={isConfirming || isRescheduling || isCancelling}
            onReschedule={() => setShowRescheduleDialog(true)}
            onCancel={() => setShowCancelDialog(true)}
          />

          <ActivityTimeline
            status={status}
            createdAt={appointment.createdAt}
            updatedAt={appointment.updatedAt}
            checkedInAt={appointment.checkedInAt}
            consultationStartedAt={appointment.consultationStartedAt}
            consultationEndedAt={appointment.consultationEndedAt}
            isPastDate={timeStatus.isPastDate}
            canStartConsultation={canStartConsultation}
            canContinueConsultation={canContinueConsultation}
            isOverdue={timeStatus.isOverdue}
          />
        </div>
      </div>

      {/* Dialogs */}
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

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
