'use client';

/**
 * Consultation Context — Compatibility Layer
 *
 * Thin façade preserving the existing useConsultationContext() API.
 * All orchestration is delegated to SessionProvider and extracted providers.
 */

import { createContext, useContext, useMemo } from 'react';
import { SessionProvider, useSessionContext, useSessionContextOpt } from '@/providers/session/SessionProvider';
import type { SessionUser } from '@/infrastructure/factories/ConsultationSessionFactory';
import type { SerializedSessionData } from '@/infrastructure/factories/ConsultationSessionFactory';
import { useDialogContext } from '@/providers/dialog/DialogProvider';
import { useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { useQueueContext } from '@/providers/queue/QueueContextProvider';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VitalsData } from '@/providers/patient/PatientContextProvider';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

// ============================================================================
// LEGACY TYPE RECONSTRUCTION
// ============================================================================

interface ConsultationWorkflowContext {
  state: string;
  error: string | null;
  isDirty: boolean;
  appointmentId: number | null;
  patientId: string | null;
  consultationId: number | null;
  lastSavedAt: Date | null;
}

interface ConsultationProviderState {
  workflow: ConsultationWorkflowContext;
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isLoading: boolean;
  isSaving: boolean;
  showCompleteDialog: boolean;
  showStartDialog: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

interface ConsultationContextValue {
  state: ConsultationProviderState;
  isActive: boolean;
  isReadOnly: boolean;
  canSave: boolean;
  canComplete: boolean;
  showStartDialog: boolean;
  showCompleteDialog: boolean;
  waitingQueue: AppointmentResponseDto[];
  refetchQueue: () => Promise<unknown>;
  isQueueRefetching: boolean;
  loadWaitingQueue: () => void;
  loadAppointment: (appointmentId: number) => Promise<void>;
  startConsultation: () => Promise<void>;
  closeStartDialog: () => void;
  saveDraft: () => Promise<void>;
  saveNotes: () => Promise<void>;
  updateNotes: (field: keyof StructuredNotes, value: string) => void;
  setOutcome: (outcome: ConsultationOutcomeType) => void;
  setPatientDecision: (decision: PatientDecision | null) => void;
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  completeConsultation: () => Promise<void>;
  switchToPatient: (appointmentId: number) => Promise<void>;
  goToSurgeryPlanning: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

function useSessionSafe() {
  const ctx = useSessionContext();
  if (!ctx) throw new Error('SessionProvider missing');
  return ctx;
}

export function ConsultationProvider({ children, initialSession, user, restoredDraft, initialAppointmentId }: { children: React.ReactNode; initialSession?: SerializedSessionData; user?: SessionUser; restoredDraft?: boolean; initialAppointmentId?: number }) {
  const existingSession = useSessionContextOpt();
  if (existingSession) {
    return <CompatibilityAdapter>{children}</CompatibilityAdapter>;
  }

  return (
    <SessionProvider initialSession={initialSession as any} user={user as any} restoredDraft={!!restoredDraft}>
      <CompatibilityAdapter>
        {children}
      </CompatibilityAdapter>
    </SessionProvider>
  );
}

function CompatibilityAdapter({ children }: { children: React.ReactNode }) {
  const session = useSessionSafe();
  const dialog = useDialogContext();
  const docs = useDocumentationContext();
  const queue = useQueueContext();

  const lastSavedAtDate = useMemo(() => {
    return docs.lastSavedAt ? new Date(docs.lastSavedAt) : null;
  }, [docs.lastSavedAt]);

  const workflow = useMemo(() => ({
    state: session.workflowState,
    error: session.error,
    isDirty: docs.isDirty,
    appointmentId: session.appointment?.id ?? null,
    patientId: session.patient?.id ?? null,
    consultationId: session.consultation?.id ?? null,
    lastSavedAt: lastSavedAtDate,
  }), [session.workflowState, session.error, docs.isDirty, session.appointment, session.patient, session.consultation, lastSavedAtDate]);

  if (session.error) {
    console.log('[ConsultationContext] session.error:', session.error, 'type:', typeof session.error);
  }

  const state = useMemo(() => ({
    workflow,
    appointment: session.appointment,
    patient: session.patient,
    vitals: session.vitals,
    consultation: session.consultation,
    doctorId: session.doctorId,
    notes: docs.notes,
    outcomeType: docs.outcomeType,
    patientDecision: docs.patientDecision,
    isLoading: session.isLoading,
    isSaving: docs.isSaving,
    showCompleteDialog: dialog.isCompleteDialogOpen,
    showStartDialog: dialog.isStartDialogOpen,
    autoSaveStatus: docs.autoSaveStatus,
  }), [workflow, session.appointment, session.patient, session.vitals, session.consultation, session.doctorId, docs.notes, docs.outcomeType, docs.patientDecision, session.isLoading, docs.isSaving, dialog.isCompleteDialogOpen, dialog.isStartDialogOpen, docs.autoSaveStatus]);

  const isActive = session.isActive;
  const isReadOnly = session.isReadOnly;
  const canSave = docs.isDirty;
  const canComplete = isActive && !docs.isSaving;

  const value = useMemo(() => ({
    state,
    isActive,
    isReadOnly,
    canSave,
    canComplete,
    showStartDialog: dialog.isStartDialogOpen,
    showCompleteDialog: dialog.isCompleteDialogOpen,
    waitingQueue: queue.waitingQueue,
    refetchQueue: queue.refetchQueue,
    isQueueRefetching: queue.isQueueRefetching,
    loadWaitingQueue: queue.loadWaitingQueue,
    loadAppointment: session.initializeSession,
    startConsultation: session.startConsultation,
    closeStartDialog: dialog.closeStartDialog,
    saveDraft: docs.saveDraft,
    saveNotes: docs.saveNotes,
    updateNotes: docs.updateNotes,
    setOutcome: docs.setOutcome,
    setPatientDecision: docs.setPatientDecision,
    openCompleteDialog: dialog.openCompleteDialog,
    closeCompleteDialog: dialog.closeCompleteDialog,
    completeConsultation: session.completeSession,
    switchToPatient: session.switchToPatient,
    goToSurgeryPlanning: session.goToSurgeryPlanning,
  }), [state, isActive, isReadOnly, canSave, canComplete, dialog.isStartDialogOpen, dialog.isCompleteDialogOpen, queue.waitingQueue, queue.refetchQueue, queue.isQueueRefetching, queue.loadWaitingQueue, session.initializeSession, session.startConsultation, dialog.closeStartDialog, docs.saveDraft, docs.saveNotes, docs.updateNotes, docs.setOutcome, docs.setPatientDecision, dialog.openCompleteDialog, dialog.closeCompleteDialog, session.completeSession, session.switchToPatient, session.goToSurgeryPlanning]);

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultationContext() {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultationContext must be used within ConsultationProvider');
  }
  return context;
}
