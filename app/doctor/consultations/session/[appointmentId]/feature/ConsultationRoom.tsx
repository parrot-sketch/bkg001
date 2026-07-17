'use client';

import { use, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, PanelLeft, PanelRight } from 'lucide-react';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';
import { ConsultationShell } from './shell/ConsultationShell';
import { ConsultationLayout } from './shell/ConsultationLayout';
import dynamic from 'next/dynamic';

const StartConsultationDialog = dynamic(
  () => import('@/components/doctor/StartConsultationDialog').then(mod => ({
    default: mod.StartConsultationDialog,
  })),
  { ssr: false }
);

const CompleteConsultationDialog = dynamic(
  () => import('@/components/consultation/CompleteConsultationDialog').then(mod => ({
    default: mod.CompleteConsultationDialog,
  })),
  { ssr: false }
);

function ConsultationRoomInner() {
  const { state, isActive, isReadOnly, waitingQueue, refetchQueue, isQueueRefetching, loadWaitingQueue, saveDraft, startConsultation, closeStartDialog, openCompleteDialog, closeCompleteDialog, completeConsultation, switchToPatient } = useConsultationContext();
  const [isPatientSidebarCollapsed, setIsPatientSidebarCollapsed] = useState(true);

  const { appointment, patient, vitals, consultation, doctorId, isLoading, isSaving, showStartDialog, showCompleteDialog, autoSaveStatus } = state;

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';

  useEffect(() => {
    if (appointment) {
      loadWaitingQueue();
    }
  }, [appointment, loadWaitingQueue]);

  if (isLoading && !appointment) {
    return <ConsultationShell type="loading" />;
  }

  if (state.workflow.error) {
    return (
      <ConsultationShell
        type="error"
        error={state.workflow.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!appointment || !patient) {
    return (
      <ConsultationShell
        type="queue"
        waitingQueue={waitingQueue}
        onRefresh={refetchQueue}
        isRefreshing={isQueueRefetching}
      />
    );
  }

  return (
    <ConsultationShell type="active">
      <ConsultationLayout
        appointment={appointment}
        patient={patient}
        vitals={vitals}
        consultation={consultation}
        doctorId={doctorId}
        patientName={patientName}
        userRole={Role.DOCTOR}
        isActive={isActive}
        isReadOnly={isReadOnly}
        isSaving={isSaving}
        autoSaveStatus={autoSaveStatus}
        isPatientSidebarCollapsed={isPatientSidebarCollapsed}
        onTogglePatientSidebar={() => setIsPatientSidebarCollapsed(v => !v)}
        slotStartTime={
          appointment.appointmentDate && appointment.time
            ? new Date(`${new Date(appointment.appointmentDate).toISOString().split('T')[0]}T${appointment.time}`)
            : undefined
        }
        slotDurationMinutes={appointment.consultationDuration || 30}
        waitingQueue={waitingQueue}
        isQueueRefetching={isQueueRefetching}
        onSaveDraft={saveDraft}
        onSwitchPatient={switchToPatient}
        onOpenCompleteDialog={openCompleteDialog}
      />

      {showStartDialog && appointment && (
        <Suspense fallback={null}>
          <StartConsultationDialog
            open={showStartDialog}
            onClose={closeStartDialog}
            onSuccess={startConsultation}
            appointment={appointment}
            doctorId={doctorId || ''}
          />
        </Suspense>
      )}

      {showCompleteDialog && consultation && appointment && doctorId && (
        <Suspense fallback={null}>
          <CompleteConsultationDialog
            open={showCompleteDialog}
            onClose={closeCompleteDialog}
            onSuccess={completeConsultation}
            consultation={consultation}
            appointment={appointment}
            doctorId={doctorId}
          />
        </Suspense>
      )}
    </ConsultationShell>
  );
}

interface ConsultationRoomProps {
  initialAppointmentId: number;
}

export function ConsultationRoom({ initialAppointmentId }: ConsultationRoomProps) {
  return (
    <ConsultationProvider initialAppointmentId={initialAppointmentId}>
      <ConsultationRoomInner />
    </ConsultationProvider>
  );
}
