'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import { usePatientContext } from '@/providers/patient/PatientContextProvider';
import { useRouter } from 'next/navigation';
import {
  ConsultationRoomLayout,
  AppHeader,
  PatientPanel,
  Workspace,
  QueuePanel,
} from '@/components/consultation/room';
import { getPatientConsultationHistory, type ConsultationHistoryItem } from '@/actions/doctor/get-patient-consultation-history';

type PrimaryTab = 'consultation' | 'vitals' | 'history' | 'billing';
type SoapTab = 'subjective' | 'objective' | 'assessment' | 'plan';

export function ConsultationSessionContent() {
  const router = useRouter();
  const { state, isReadOnly, canSave, switchToPatient, updateNotes, saveDraft, completeConsultation, waitingQueue, refetchQueue, isQueueRefetching } =
    useConsultationContext();
  const { patient, vitals, isLoading: patientLoading, refreshPatient } = usePatientContext();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [queuePanelOpen, setQueuePanelOpen] = useState(true);
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('consultation');
  const [soapTab, setSoapTab] = useState<SoapTab>('subjective');
  const [sidebarRefetchKey, setSidebarRefetchKey] = useState(0);
  const [history, setHistory] = useState<ConsultationHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isReadOnly) {
      setPrimaryTab('consultation');
    }
  }, [isReadOnly]);

  useEffect(() => {
    let cancelled = false;
    const patientId = patient?.id;

    const loadHistory = async () => {
      if (!patientId) {
        setHistory([]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const result = await getPatientConsultationHistory(patientId);
        if (cancelled) return;
        if (result.success) {
          setHistory(result.data.consultations);
        }
      } catch {
        if (!cancelled) {
          console.error('Failed to load consultation history');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [patient?.id]);

  const notes = state.notes;
  const isDirty = canSave;
  const isSaving = state.isSaving;
  const isLoading = state.isLoading;
  const autoSaveStatus = state.autoSaveStatus;
  const appointment = state.appointment;

  const patientName = patient
    ? `${patient.firstName || 'Unknown'} ${patient.lastName || 'Patient'}`
    : 'Loading patient…';

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
    try {
      if (isDirty) {
        await saveDraft();
      }
      await switchToPatient(targetId);
      setSidebarRefetchKey((k) => k + 1);
      toast.success('Loaded next patient');
    } catch (err: any) {
      console.error('Failed to load next patient:', err);
      toast.error(err?.message || 'Failed to switch patient');
    }
  }, [nextPatient, isDirty, saveDraft, switchToPatient]);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
    } catch {
      // Inline save status already reflects failure; no duplicate toast.
    }
  }, [saveDraft]);

  const handleComplete = useCallback(async () => {
    try {
      if (isDirty) {
        await saveDraft();
      }
      await completeConsultation();
      setSidebarRefetchKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete consultation');
    }
  }, [isDirty, saveDraft, completeConsultation]);

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
      if (!appointment) return;
      try {
        if (isDirty) {
          await saveDraft();
        }
        await switchToPatient(targetAppointmentId);
        setSidebarRefetchKey((k) => k + 1);
      } catch (err: any) {
        console.error('Failed to load next patient:', err);
        toast.error(err?.message || 'Failed to switch patient');
      }
    },
    [appointment, switchToPatient, isDirty, saveDraft]
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
          onTogglePatientSidebar={() => setSidebarOpen((v) => !v)}
          onToggleQueuePanel={() => setQueuePanelOpen((v) => !v)}
          onNextPatient={handleNextPatient}
          hasNextPatient={!!nextPatient()}
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
          primaryTab={primaryTab}
          soapTab={soapTab}
          onPrimaryTabChange={setPrimaryTab}
          onSoapTabChange={setSoapTab}
          notes={notes}
          onUpdateNotes={updateNotes}
          isReadOnly={isReadOnly}
          isSaving={isSaving}
          isDirty={isDirty}
          onSaveDraft={handleSaveDraft}
          onComplete={handleComplete}
          vitals={vitals}
          patientLoading={patientLoading}
          queueLength={waitingQueue.length}
          history={history}
          isLoadingHistory={isLoadingHistory}
          onReturnToHub={() => router.push('/doctor/consultations')}
        />
      }
      queuePanel={
        <QueuePanel
          queue={waitingQueue}
          onRefresh={refetchQueue}
          onLoadPatient={handleLoadPatient}
          isRefetching={isQueueRefetching}
        />
      }
      sidebarOpen={sidebarOpen}
      queuePanelOpen={queuePanelOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      onToggleQueuePanel={() => setQueuePanelOpen((v) => !v)}
    />
  );
}
