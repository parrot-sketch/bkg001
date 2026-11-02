'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import { usePatientContext } from '@/providers/patient/PatientContextProvider';
import { startSession } from '@/actions/doctor/consultation-session';
import { runEncounterTransition } from '@/lib/consultation/encounterTransition';
import { useRouter } from 'next/navigation';
import {
  ConsultationRoomLayout,
  AppHeader,
  PatientPanel,
  Workspace,
  QueuePanel,
} from '@/components/consultation/room';

export function ConsultationSessionContent() {
  const router = useRouter();
  const { state, isReadOnly, canSave, switchToPatient, updateNotes, saveDraft, completeConsultation, waitingQueue, refetchQueue, isQueueRefetching, queueReady, loadWaitingQueue } =
    useConsultationContext();
  const { patient, vitals, refreshPatient } = usePatientContext();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const [sidebarRefetchKey, setSidebarRefetchKey] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const transitionGuard = useRef(false);

  useEffect(() => {
    loadWaitingQueue();
  }, [loadWaitingQueue]);

  useEffect(() => {
    const patientQuery = window.matchMedia('(min-width: 1024px)');
    const queueQuery = window.matchMedia('(min-width: 1280px)');
    const sync = () => {
      setSidebarOpen(patientQuery.matches);
      setQueuePanelOpen(queueQuery.matches);
    };
    sync();
    patientQuery.addEventListener('change', sync);
    queueQuery.addEventListener('change', sync);
    return () => {
      patientQuery.removeEventListener('change', sync);
      queueQuery.removeEventListener('change', sync);
    };
  }, []);

  const notes = state.notes;
  const isDirty = canSave;
  const isSaving = state.isSaving;
  const autoSaveStatus = state.autoSaveStatus;
  const appointment = state.appointment;

  const patientName = patient
    ? `${patient.firstName || 'Unknown'} ${patient.lastName || 'Patient'}`
    : 'Loading patient…';
  const chargeSheetDestination = patient?.id
    ? `/doctor/patients/${patient.id}?tab=charges`
    : '/doctor/dashboard';

  const nextPatient = useCallback(() => {
    const currentId = appointment?.id;
    if (!currentId || waitingQueue.length === 0) return null;
    const currentIndex = waitingQueue.findIndex(q => q.appointmentId === currentId);
    const nextQueueItem = waitingQueue[currentIndex + 1];
    return nextQueueItem?.appointmentId ?? null;
  }, [appointment?.id, waitingQueue]);

  const handleNextPatient = useCallback(async () => {
    const targetId = nextPatient();
    if (!targetId) {
      toast.info('No next patient in queue');
      return;
    }
    if (transitionGuard.current) return;
    try {
      const outcome = await runEncounterTransition({
        guard: transitionGuard,
        save: saveDraft,
        transition: () => switchToPatient(targetId),
      });
      if (outcome !== 'completed') return;
      setSidebarRefetchKey((k) => k + 1);
      toast.success('Loaded next patient');
    } catch (err: any) {
      console.error('Failed to load next patient:', err);
      toast.error(err?.message || 'Failed to switch patient');
    }
  }, [nextPatient, saveDraft, switchToPatient]);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
    } catch {
      // Inline save status already reflects failure; no duplicate toast.
    }
  }, [saveDraft]);

  const handleComplete = useCallback(async () => {
    if (isReadOnly || transitionGuard.current) return;
    setIsCompleting(true);
    try {
      const outcome = await runEncounterTransition({
        guard: transitionGuard,
        save: saveDraft,
        transition: async () => {
          await completeConsultation();
        },
      });
      if (outcome !== 'completed') return;
      setSidebarRefetchKey((k) => k + 1);
      loadWaitingQueue();
      await refetchQueue();
      setQueuePanelOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete consultation');
    } finally {
      setIsCompleting(false);
    }
  }, [isReadOnly, saveDraft, completeConsultation, loadWaitingQueue, refetchQueue]);

  const handleAdmit = useCallback(async (targetAppointmentId: number) => {
    if (admitting) return;
    const doctorId = state.doctorId;
    if (!doctorId) {
      toast.error('Unable to admit this patient');
      return;
    }
    setAdmitting(true);
    try {
      const result = await startSession(targetAppointmentId, doctorId);
      if (!result.success) {
        toast.error(result.error.message || 'Unable to admit this patient');
        return;
      }
      router.push(`/doctor/consultations/session/${targetAppointmentId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to admit this patient');
    } finally {
      setAdmitting(false);
    }
  }, [admitting, state.doctorId, router]);

  const navigateAfterSave = useCallback(async (destination: string) => {
    if (transitionGuard.current) return;
    try {
      const outcome = await runEncounterTransition({
        guard: transitionGuard,
        save: saveDraft,
        transition: async () => {
          router.push(destination);
        },
      });
      if (outcome !== 'completed') return;
    } catch (err: any) {
      toast.error(err?.message || 'Save the note before leaving this consultation');
    }
  }, [saveDraft, router]);

  const handleRefreshPatient = useCallback(async () => {
    if (!refreshPatient || !patient?.id) return;
    try {
      await refreshPatient();
      setSidebarRefetchKey((k) => k + 1);
      toast.success('Patient data refreshed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to refresh patient');
    }
  }, [refreshPatient, patient?.id]);

  const handleLoadPatient = useCallback(
    async (targetAppointmentId: number) => {
      if (!appointment || transitionGuard.current) return;
      try {
        const outcome = await runEncounterTransition({
          guard: transitionGuard,
          save: saveDraft,
          transition: () => switchToPatient(targetAppointmentId),
        });
        if (outcome !== 'completed') return;
        setSidebarRefetchKey((k) => k + 1);
      } catch (err: any) {
        console.error('Failed to load next patient:', err);
        toast.error(err?.message || 'Failed to switch patient');
      }
    },
    [appointment, switchToPatient, saveDraft]
  );

  return (
    <ConsultationRoomLayout
      header={
        <AppHeader
          patientName={patientName}
          appointmentStatus={appointment?.status}
          onSaveDraft={handleSaveDraft}
          onComplete={handleComplete}
          autoSaveStatus={autoSaveStatus}
          isSaving={isSaving}
          patientSidebarCollapsed={!sidebarOpen}
          queuePanelCollapsed={!queuePanelOpen}
          onTogglePatientSidebar={() => {
            setSidebarOpen((open) => {
              const next = !open;
              if (next && window.innerWidth < 1280) setQueuePanelOpen(false);
              return next;
            });
          }}
          onToggleQueuePanel={() => {
            setQueuePanelOpen((open) => {
              const next = !open;
              if (next && window.innerWidth < 1280) setSidebarOpen(false);
              return next;
            });
          }}
          onNextPatient={isReadOnly ? undefined : handleNextPatient}
          hasNextPatient={!isReadOnly && !!nextPatient()}
          onBack={() => { void navigateAfterSave(chargeSheetDestination); }}
        />
      }
      patientPanel={
        patient ? (
          <PatientPanel
            patient={patient}
            vitals={vitals ?? undefined}
            appointment={appointment}
            onRefresh={handleRefreshPatient}
            refetchKey={sidebarRefetchKey}
          />
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-[#e7d6bf]">
              <div className="h-10 w-10 rounded-full bg-[#e7d6bf]/60 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-3/4 rounded bg-[#e7d6bf]/60 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[#e7d6bf]/40 animate-pulse mt-1.5" />
              </div>
            </div>
            <div className="h-3 w-1/3 rounded bg-[#e7d6bf]/40 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-[#e7d6bf]/40 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-[#e7d6bf]/40 animate-pulse" />
          </div>
        )
      }
      workspace={
        <Workspace
          appointmentId={appointment?.id ?? null}
          notes={notes}
          onUpdateNotes={updateNotes}
          isReadOnly={isReadOnly}
          isSaving={isSaving}
          isCompleting={isCompleting}
          isDirty={isDirty}
          onSaveDraft={handleSaveDraft}
          onComplete={handleComplete}
          onReturnToHub={() => { void navigateAfterSave(chargeSheetDestination); }}
          onLeave={() => { void navigateAfterSave('/doctor/dashboard'); }}
          queueReady={queueReady}
          nextPatient={(() => {
            const waiting = waitingQueue[0];
            if (!waiting?.appointmentId) return null;
            const name = `${waiting.patient?.firstName || ''} ${waiting.patient?.lastName || ''}`.trim();
            return {
              appointmentId: waiting.appointmentId,
              name: name || 'Next patient',
              fileNumber: waiting.patient?.fileNumber || '',
            };
          })()}
          onAdmitNext={() => {
            const targetId = waitingQueue[0]?.appointmentId;
            if (targetId) void handleAdmit(targetId);
          }}
          admitting={admitting}
        />
      }
      queuePanel={
        <QueuePanel
          queue={waitingQueue}
          onRefresh={refetchQueue}
          onLoadPatient={isReadOnly ? handleAdmit : handleLoadPatient}
          actionLabel={isReadOnly ? 'Admit' : 'Load'}
          isRefetching={isQueueRefetching}
        />
      }
      sidebarOpen={sidebarOpen}
      queuePanelOpen={queuePanelOpen}
      onToggleSidebar={() => setSidebarOpen(false)}
      onToggleQueuePanel={() => setQueuePanelOpen(false)}
    />
  );
}
