'use client';

import { useState, useEffect, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentDetail } from '../../../../hooks/frontdesk/appointments/useAppointmentDetail';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { FrontdeskStatusHeroBanner } from './components/FrontdeskStatusHeroBanner';
import { FrontdeskPatientInfoCard } from './components/FrontdeskPatientInfoCard';
import { FrontdeskAppointmentDetailsCard } from './components/FrontdeskAppointmentDetailsCard';
import { FrontdeskNotesSection } from './components/FrontdeskNotesSection';
import { FrontdeskActionPanel } from './components/FrontdeskActionPanel';
import { FrontdeskActivityTimeline } from './components/FrontdeskActivityTimeline';
import { RescheduleDialog } from '@/components/appointments/RescheduleDialog';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { ChargeSheetCard } from '@/components/billing/ChargeSheetCard';
import { useChargeSheet } from '@/hooks/billing/useChargeSheet';
import { useFinalizeChargeSheet } from '@/hooks/billing/useFinalizeChargeSheet';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FrontdeskAppointmentDetailPage({ params }: PageProps) {
  const {
    appointment,
    isLoading,
    error,
    isCheckingIn,
    handleCheckIn,
    patientName,
    router,
    appointmentId,
  } = useAppointmentDetail(params);

  const { isRescheduling, isCancelling, isMarkingNoShow } = useAppointments();
  const isCompleted = appointment?.status === AppointmentStatus.COMPLETED;
  const { chargeSheet: frontdeskChargeSheet, isLoading: isLoadingChargeSheet } = useChargeSheet(
    isCompleted && appointmentId ? appointmentId : null,
    isCompleted
  );

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [recentAction, setRecentAction] = useState<{
    type: 'checked-in' | 'rescheduled' | 'cancelled' | 'no-show' | null;
    timestamp: number;
  }>({ type: null, timestamp: 0 });

  const { finalizeChargeSheet, isPending: isFinalizing } = useFinalizeChargeSheet();

  const timeStatus = appointment
    ? (() => {
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
      })()
    : { isAppointmentToday: false, isOverdue: false, isPastDate: false, slotEndTime: null as Date | null };

  const status = appointment?.status as AppointmentStatus;
  const isTerminal = status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW;
  const isBusy = isCheckingIn || isRescheduling || isCancelling || isMarkingNoShow;

  useEffect(() => {
    if (recentAction.type) {
      const timer = setTimeout(() => setRecentAction({ type: null, timestamp: 0 }), 5000);
      return () => clearTimeout(timer);
    }
  }, [recentAction.type]);

  const age = appointment?.patient?.dateOfBirth
    ? new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear()
    : undefined;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#e7d6bf] shadow-sm">
        <div className="h-16 w-16 bg-[#e7d6bf] flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-[#caa26a]" />
        </div>
        <h2 className="text-xl font-bold text-[#2c2e4b] mb-2">Appointment Not Found</h2>
        <p className="text-sm text-[#2c2e4b]/60 mb-8 max-w-xs text-center">
          The clinical record or booking reference could not be retrieved.
        </p>
        <Button onClick={() => router.back()} variant="outline" className="rounded-lg border-[#e7d6bf] text-[#2c2e4b]">
          Return to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FrontdeskStatusHeroBanner
        status={status}
        appointmentId={appointment.id}
        time={appointment.time}
        date={appointment.appointmentDate}
        onCheckIn={handleCheckIn}
        isCheckingIn={isCheckingIn}
      />

      {recentAction.type && (
        <div className="border border-[#caa26a]/30 bg-[#e7d6bf]/30 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-[#caa26a] shrink-0" />
            <p className="font-medium text-[#2c2e4b]">
              {recentAction.type === 'checked-in' && 'Patient checked in successfully'}
              {recentAction.type === 'rescheduled' && 'Appointment rescheduled'}
              {recentAction.type === 'cancelled' && 'Appointment cancelled'}
              {recentAction.type === 'no-show' && 'Appointment marked as no-show'}
            </p>
          </div>
        </div>
      )}

      {!isTerminal && (
        <WorkflowStepper status={status} />
      )}

      {isBusy && (
        <div className="flex items-center gap-3 p-4 border border-[#e7d6bf] bg-[#e7d6bf]/30 text-sm">
          <LoaderIcon className="h-4 w-4 text-[#caa26a] animate-spin shrink-0" />
          <p className="text-[#2c2e4b] font-medium">
            Processing...
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FrontdeskPatientInfoCard
            patientName={patientName}
            patientInitials={appointment.patient ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase() : '?'}
            patientImg={appointment.patient?.img}
            fileNumber={appointment.patient?.fileNumber}
            age={age}
            gender={appointment.patient?.gender}
            email={appointment.patient?.email}
            phone={appointment.patient?.phone}
            allergies={appointment.patient?.allergies}
            patientId={appointment.patientId}
            onViewRecord={() => router.push(`/frontdesk/patient/${appointment.patientId}`)}
          />

          <FrontdeskNotesSection reason={appointment.reason} note={appointment.note} />
        </div>

        <div className="space-y-6">
          <FrontdeskAppointmentDetailsCard
            appointmentDate={appointment.appointmentDate}
            time={appointment.time}
            type={appointment.type}
            doctorName={appointment.doctor?.name}
            checkedInAt={appointment.checkedInAt}
            consultationStartedAt={appointment.consultationStartedAt}
            consultationEndedAt={appointment.consultationEndedAt}
            consultationDuration={appointment.consultationDuration}
          />

          {isCompleted && !isLoadingChargeSheet && frontdeskChargeSheet && (
            <ChargeSheetCard
              chargeSheet={frontdeskChargeSheet}
              appointmentId={appointment.id}
              onEdit={() => router.push(`/frontdesk/appointments/${appointment.id}?tab=chargesheet`)}
              onFinalize={async () => {
                await finalizeChargeSheet({ appointmentId: appointment.id });
                router.refresh();
              }}
            />
          )}

          <FrontdeskActionPanel
            status={status}
            isPastDate={timeStatus.isPastDate}
            isBusy={isBusy}
            isCheckingIn={isCheckingIn}
            appointmentId={appointment.id}
            patientId={appointment.patientId}
            onCheckIn={handleCheckIn}
            onReschedule={() => setShowRescheduleDialog(true)}
            onCancel={() => setShowCancelDialog(true)}
            onMarkNoShow={() => {}}
            onViewPatient={() => router.push(`/frontdesk/patient/${appointment.patientId}`)}
            onBack={() => router.push('/frontdesk/appointments')}
          />

          <FrontdeskActivityTimeline
            status={status}
            createdAt={appointment.createdAt}
            updatedAt={appointment.updatedAt}
            checkedInAt={appointment.checkedInAt}
            consultationStartedAt={appointment.consultationStartedAt}
            consultationEndedAt={appointment.consultationEndedAt}
            isPastDate={timeStatus.isPastDate}
          />
        </div>
      </div>

      <RescheduleDialog
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        appointment={{
          id: appointment.id,
          appointmentDate: appointment.appointmentDate,
          time: appointment.time,
          patient: appointment.patient,
        }}
        onSuccess={() => {
          setRecentAction({ type: 'rescheduled', timestamp: Date.now() });
          router.refresh();
        }}
      />

      <CancelAppointmentDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        appointmentId={appointment.id}
        onSuccess={() => {
          setRecentAction({ type: 'cancelled', timestamp: Date.now() });
          router.refresh();
        }}
      />

    </div>
  );
}

function WorkflowStepper({ status }: { status: AppointmentStatus }) {
  const activeStep = getActiveStep(status);
  if (activeStep === -1) return null;

  const steps = [
    { key: 'booked', label: 'Booked', icon: BookedIcon },
    { key: 'confirmed', label: 'Confirmed', icon: ConfirmedIcon },
    { key: 'checked_in', label: 'Checked In', icon: CheckedInIcon },
    { key: 'consultation', label: 'Consultation', icon: ConsultationIcon },
    { key: 'completed', label: 'Completed', icon: CompletedIcon },
  ] as const;

  return (
    <div className="border border-[#e7d6bf] bg-white p-4">
      <div className="flex items-center justify-between overflow-x-auto gap-1">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isDone = index < activeStep;
          const isFuture = index > activeStep;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                    isDone && 'bg-[#e7d6bf] text-[#2c2e4b]',
                    isActive && 'bg-[#2c2e4b] text-white',
                    isFuture && 'bg-[#e7d6bf]/50 text-[#2c2e4b]/50'
                  )}
                >
                  {isDone ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold text-center leading-tight',
                    isDone && 'text-[#2c2e4b]',
                    isActive && 'text-[#2c2e4b]',
                    isFuture && 'text-[#2c2e4b]/50'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-2 min-w-[16px]',
                    isDone ? 'bg-[#2c2e4b]/30' : 'bg-[#e7d6bf]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      return -1;
    default:
      return 0;
  }
}

function BookedIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function ConfirmedIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CheckedInIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
function ConsultationIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.5-4.5S12 5.765 12 8.25c0 1.327.632 2.508 1.612 3.267m-5.224 0c.98.759 1.612 1.94 1.612 3.267 0 2.485-2.099 4.5-4.5 4.5S.75 18.032.75 15.547c0-1.327.632-2.508 1.612-3.267m5.224 0c.98-.759 1.612-1.94 1.612-3.267 0-2.485 2.099-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 1.327-.632 2.508-1.612 3.267" /></svg>;
}
function CompletedIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function LoaderIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348c4.87.101 8.746 3.593 8.847 8.575M4.511 12.653c.012-4.907 3.89-8.91 8.76-8.985M19.5 12c0-4.5-3.5-8-8-8s-8 3.5-8 8" /></svg>;
}
