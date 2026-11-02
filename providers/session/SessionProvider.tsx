'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { VitalsData } from '@/providers/patient/PatientContextProvider';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import type { SessionUser } from '@/infrastructure/factories/ConsultationSessionFactory';
import type { SerializedSessionData } from '@/infrastructure/factories/ConsultationSessionFactory';
import {
  initializeSession as initializeSessionAction,
  startSession as startSessionAction,
  completeSession as completeSessionAction,
  resumeSession as resumeSessionAction,
  cancelCompletion as cancelCompletionAction,
  switchToPatient as switchToPatientAction,
  advanceQueue as advanceQueueAction,
  sendHeartbeat as sendHeartbeatAction,
  saveDraft as saveDraftAction,
  saveCompletedNotes as saveCompletedNotesAction,
  refreshPatient as refreshPatientAction,
  refreshVitals as refreshVitalsAction,
} from '@/actions/doctor/consultation-session';

import { BillingProvider } from '@/providers/billing/BillingProvider';
import { DialogProvider } from '@/providers/dialog/DialogProvider';
import { TimerContextProvider } from '@/providers/timer/TimerContextProvider';
import { QueueContextProvider } from '@/providers/queue/QueueContextProvider';
import { PatientContextProvider } from '@/providers/patient/PatientContextProvider';
import { DocumentationProvider } from '@/providers/documentation/DocumentationProvider';

// ============================================================================
// TYPES
// ============================================================================

interface SessionContextValue {
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isLoading: boolean;
  error: string | null;
  workflowState: ConsultationWorkflowState;
  isInitializing: boolean;
  isReady: boolean;
  initializeSession: (appointmentId: number) => Promise<void>;
  startSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  cancelCompletion: () => Promise<void>;
  switchToPatient: (appointmentId: number) => Promise<void>;
  advanceQueue: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
  startConsultation: () => Promise<void>;
  goToSurgeryPlanning: () => void;
  isActive: boolean;
  isReadOnly: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  initialSession: SerializedSessionData;
  user: SessionUser;
  restoredDraft: boolean;
}

function toWorkflowState(state: string): ConsultationWorkflowState {
  switch (state) {
    case 'IDLE':
      return ConsultationWorkflowState.IDLE;
    case 'READY':
      return ConsultationWorkflowState.READY;
    case 'ACTIVE':
      return ConsultationWorkflowState.ACTIVE;
    case 'PAUSED':
      return ConsultationWorkflowState.PAUSED;
    case 'COMPLETED':
      return ConsultationWorkflowState.COMPLETED;
    default:
      return ConsultationWorkflowState.IDLE;
  }
}

function isAlreadyCompletedMessage(message: string): boolean {
  return /G-044|G-045|already been completed|not IN_PROGRESS|Appointment is COMPLETED/i.test(message);
}

function toErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'An unexpected error occurred';
  }
  const maybeMessage = (error as Record<string, unknown>).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    return maybeMessage;
  }
  const maybeCode = (error as Record<string, unknown>).code;
  if (typeof maybeCode === 'string' && maybeCode.trim()) {
    return maybeCode;
  }
  try {
    const json = JSON.stringify(error);
    if (json && json !== '{}' && json !== '[]') return json;
  } catch {
    // ignore serialization failures
  }
  return 'An unexpected error occurred';
}

function appointmentCanStart(status?: string | null): boolean {
  return status !== AppointmentStatus.COMPLETED && status !== AppointmentStatus.CANCELLED;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function SessionProvider({ children, initialSession, user, restoredDraft }: SessionProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(initialSession?.appointment as any ?? null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(initialSession?.patient as any ?? null);
  const [vitals, setVitals] = useState<VitalsData | null>(initialSession?.vitals as any ?? null);
  const [consultation, setConsultation] = useState<ConsultationResponseDto | null>(initialSession?.consultation as any ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(initialSession?.doctorId ?? null);
  const [notes, setNotes] = useState<StructuredNotes>(initialSession?.notes ?? {});
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | null>(initialSession?.outcomeType ?? null);
  const [patientDecision, setPatientDecision] = useState<PatientDecision | null>(initialSession?.patientDecision ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<ConsultationWorkflowState>(
    initialSession?.workflowState ? toWorkflowState(initialSession.workflowState) : ConsultationWorkflowState.IDLE
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [initializationAttempted, setInitializationAttempted] = useState(true);

  const isCompletingRef = useRef(false);

  const isActive = useMemo(() => {
    if (!appointment || !consultation) return false;
    const completed = appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED;
    return !completed && consultation.state === ConsultationState.IN_PROGRESS;
  }, [appointment, consultation]);

  const isReadOnly = useMemo(() => {
    if (!appointment) return false;
    const completed = appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED;
    return completed || consultation?.state === ConsultationState.COMPLETED;
  }, [appointment, consultation]);

  useEffect(() => {
    if (!appointment) return;
    const expectedPath = `/doctor/consultations/session/${appointment.id}`;
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState(null, '', expectedPath);
    }
  }, [appointment?.id]);

  const initializeSession = useCallback(async (appointmentId: number) => {
    try {
      const result = await initializeSessionAction(appointmentId);
      if (result.success) {
        const session = result.data.session;
        setAppointment(session.appointment as any);
        setPatient(session.patient as any);
        setVitals(session.vitals as any);
        setConsultation(session.consultation as any);
        setDoctorId(session.doctorId);
        setNotes(session.notes);
        setOutcomeType(session.outcomeType);
        setPatientDecision(session.patientDecision);
        setWorkflowState(toWorkflowState(session.workflowState));
        setIsReady(true);
      } else {
        setError(toErrorMessage(result.error));
      }
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, []);

  const startConsultation = useCallback(async () => {
    if (!user || !appointment) return;
    try {
      const result = await startSessionAction(appointment.id, doctorId || user.id);
      if (result.success) {
        const session = result.data.session;
        setAppointment(session.appointment as any);
        setPatient(session.patient as any);
        setVitals(session.vitals as any);
        setConsultation(session.consultation as any);
        setDoctorId(session.doctorId);
        setNotes(session.notes);
        setOutcomeType(session.outcomeType);
        setPatientDecision(session.patientDecision);
        setWorkflowState(toWorkflowState(session.workflowState));
        queryClient.invalidateQueries({ queryKey: ['doctor', user.id, 'appointments'] });
      } else {
        toast.error(toErrorMessage(result.error) || 'Failed to start consultation');
      }
    } catch (error) {
      toast.error(toErrorMessage(error) || 'Failed to start consultation');
    }
  }, [user, appointment, doctorId, queryClient]);

  const completeSession = useCallback(async () => {
    console.log('[DEBUG completeSession] appointment=', appointment, 'consultation=', consultation);
    if (!appointment) {
      console.log('[DEBUG completeSession] GUARD TRIGGERED - appointment is null');
      toast.error('Consultation session is not initialized. Please refresh the page.');
      return;
    }
    console.log('[DEBUG completeSession] GUARD PASSED - calling API for appointment', appointment.id);
    if (isCompletingRef.current) return;
    if (appointment.status === 'COMPLETED') return;
    isCompletingRef.current = true;
    const markCompleted = () => {
      setAppointment((prev) => prev ? { ...prev, status: 'COMPLETED' as any, consultationEndedAt: new Date() } : prev);
      setConsultation((prev) => prev ? { ...prev, state: 'COMPLETED' as ConsultationState, completedAt: new Date() } : prev);
    };
    try {
      console.log('[DEBUG completeSession] BEFORE API CALL');
      const result = await completeSessionAction(appointment.id);
      console.log('[DEBUG completeSession] AFTER API CALL result=', result);
      if (result.success) {
        for (const instruction of result.data.invalidationInstructions) {
          if (instruction.direction === 'invalidate') {
            queryClient.invalidateQueries({ queryKey: instruction.queryKey as any });
          }
        }
        markCompleted();
        toast.success('Consultation completed');
      } else {
        const message = toErrorMessage(result.error) || 'Failed to complete consultation';
        if (isAlreadyCompletedMessage(message)) {
          markCompleted();
        } else {
          throw new Error(message);
        }
      }
    } catch (error) {
      const message = toErrorMessage(error) || 'Failed to complete consultation';
      if (isAlreadyCompletedMessage(message)) {
        markCompleted();
      } else {
        throw error instanceof Error ? error : new Error(message);
      }
    } finally {
      isCompletingRef.current = false;
    }
  }, [consultation, appointment, queryClient]);

  const openConsultation = useCallback(async (
    appointmentId: number,
    starterDoctorId: string | null | undefined,
  ): Promise<SerializedSessionData | null> => {
    if (!starterDoctorId) return null;
    const started = await startSessionAction(appointmentId, starterDoctorId);
    if (!started.success || !started.data.session?.consultation?.id) {
      if (!started.success) {
        toast.error(toErrorMessage(started.error) || 'Failed to start consultation');
      }
      return null;
    }
    return started.data.session;
  }, []);

  const switchToPatient = useCallback(async (appointmentId: number) => {
    if (!appointment || !user) return;
    try {
      const result = await switchToPatientAction(appointment.id, appointmentId);
      if (result.success) {
        const next = result.data.nextSession;
        if (next) {
          let session = next.session as SerializedSessionData;
          if (session?.appointment?.id && !session.consultation?.id && appointmentCanStart(session.appointment.status)) {
            const opened = await openConsultation(session.appointment.id, session.doctorId || doctorId || user.id);
            if (opened) session = opened;
          }
          setAppointment(session.appointment as any);
          setPatient(session.patient as any);
          setVitals(session.vitals as any);
          setConsultation(session.consultation as any);
          setDoctorId(session.doctorId);
          setNotes(session.notes);
          setOutcomeType(session.outcomeType);
          setPatientDecision(session.patientDecision);
          setWorkflowState(toWorkflowState(session.workflowState));
          setIsReady(true);
        }

        for (const instruction of result.data.invalidationInstructions) {
          if (instruction.direction === 'invalidate') {
            queryClient.invalidateQueries({ queryKey: instruction.queryKey as any });
          }
        }
      } else {
        toast.error(toErrorMessage(result.error) || 'Failed to switch patient');
      }
    } catch (error) {
      toast.error(toErrorMessage(error) || 'Failed to switch patient');
    }
  }, [user, appointment, doctorId, openConsultation, queryClient]);

  const resumeSession = useCallback(async () => {
    if (!consultation || !appointment) return;
    try {
      const result = await resumeSessionAction(appointment.id);
      if (result.success) {
        const session = result.data.session;
        setAppointment(session.appointment as any);
        setPatient(session.patient as any);
        setVitals(session.vitals as any);
        setConsultation(session.consultation as any);
        setDoctorId(session.doctorId);
        setNotes(session.notes);
        setOutcomeType(session.outcomeType);
        setPatientDecision(session.patientDecision);
        setWorkflowState(toWorkflowState(session.workflowState));
        setIsReady(true);
      } else {
        toast.error(toErrorMessage(result.error) || 'Failed to resume consultation');
      }
    } catch (error) {
      toast.error(toErrorMessage(error) || 'Failed to resume consultation');
    }
  }, [appointment, consultation]);

  const cancelCompletion = useCallback(async () => {
    try {
      const result = await cancelCompletionAction();
      if (result.success) {
        const session = result.data;
        setAppointment(session.appointment);
        setPatient(session.patient);
        setVitals(session.vitals as any);
        setConsultation(session.consultation as any);
        setDoctorId(session.doctorId);
        setNotes(session.notes);
        setOutcomeType(session.outcomeType);
        setPatientDecision(session.patientDecision);
        setError(null);
      } else {
        toast.error(toErrorMessage(result.error) || 'Failed to cancel completion');
      }
    } catch (error) {
      toast.error(toErrorMessage(error) || 'Failed to cancel completion');
    }
  }, []);

  const advanceQueue = useCallback(async () => {
    if (!user) return;
    try {
      const result = await advanceQueueAction(doctorId || user.id);
      if (result.success) {
        const next = result.data;
        if (next === null) {
          setAppointment(null);
          setPatient(null);
          setVitals(null);
          setConsultation(null);
          setDoctorId(null);
          setIsReady(false);
        } else {
          const session = next.session;
          setAppointment(session.appointment);
          setPatient(session.patient);
          setVitals(session.vitals as any);
          setConsultation(session.consultation as any);
          setDoctorId(session.doctorId);
          setWorkflowState(toWorkflowState(session.workflowState));
          setIsReady(true);
        }
      } else {
        toast.error(toErrorMessage(result.error) || 'Failed to advance queue');
      }
    } catch (error) {
      toast.error(toErrorMessage(error) || 'Failed to advance queue');
    }
  }, [user, doctorId]);

  const sendHeartbeat = useCallback(async () => {
    if (!consultation) return;
    try {
      await sendHeartbeatAction(consultation.id);
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, [consultation]);

  const goToSurgeryPlanning = useCallback(() => {
    if (!appointment) return;
    router.push(`/doctor/operative/plan/${appointment.id}/new`);
  }, [appointment, router]);

  const docsProps = useMemo(() => ({
    appointmentId: appointment?.id ?? null,
    consultationId: consultation?.id ?? null,
    doctorId,
    isCompleted: isReadOnly,
    notes,
    outcomeType,
    patientDecision,
    onSaveDraft: async (draftNotes: StructuredNotes, draftOutcome: ConsultationOutcomeType | null, draftDecision: PatientDecision | null): Promise<{ success: true; version: string }> => {
      const activeAppointmentId = appointment?.id;
      let activeConsultationId = consultation?.id;
      if (activeAppointmentId && !activeConsultationId && appointmentCanStart(appointment?.status)) {
        const opened = await openConsultation(activeAppointmentId, doctorId || appointment?.doctorId);
        if (opened?.consultation?.id) {
          activeConsultationId = opened.consultation.id;
          setConsultation(opened.consultation as any);
          setAppointment(opened.appointment as any);
          setWorkflowState(toWorkflowState(opened.workflowState));
          if (opened.doctorId) setDoctorId(opened.doctorId);
        }
      }
      if (!activeAppointmentId || !activeConsultationId) {
        throw new Error('Start the consultation before saving notes');
      }
      const result = await saveDraftAction(activeAppointmentId, activeConsultationId, {
        chiefComplaint: draftNotes.chiefComplaint,
        examination: draftNotes.examination,
        assessment: draftNotes.assessment,
        plan: draftNotes.plan,
      }, draftOutcome as any, draftDecision as any);
      if (result.success) {
        return { success: true, version: result.data.version || '' };
      }
      throw new Error(result.error?.message || 'Failed to save draft');
    },
    onSaveNotes: async (completedNotes: StructuredNotes) => {
      const activeAppointmentId = appointment?.id;
      const activeConsultationId = consultation?.id;
      if (!activeAppointmentId || !activeConsultationId) {
        throw new Error('Consultation not found');
      }
      const result = await saveCompletedNotesAction(activeAppointmentId, activeConsultationId, {
        chiefComplaint: completedNotes.chiefComplaint,
        examination: completedNotes.examination,
        assessment: completedNotes.assessment,
        plan: completedNotes.plan,
      });
      if (result.success) {
        return { success: true as const };
      }
      throw new Error(result.error?.message || 'Failed to save notes');
    },
  }), [appointment, consultation?.id, doctorId, isReadOnly, notes, outcomeType, patientDecision, openConsultation]);

  const patientProps = useMemo(() => ({
    patient,
    appointment,
    vitals,
    isLoading,
    error,
    consultationId: consultation?.id ?? null,
    onRefreshPatient: async (patientId: string) => {
      const result = await refreshPatientAction(patientId);
      if (result.success) {
        const patientData = (result.data as any)?.patient;
        if (patientData) {
          setPatient(patientData);
        }
      } else {
        setError(toErrorMessage(result.error));
      }
    },
    onRefreshAppointments: async () => {
      // Placeholder - can be implemented if needed
    },
    onRefreshVitals: async (patientId: string, consultationId: number) => {
      const result = await refreshVitalsAction(patientId, consultationId);
      if (result.success) {
        setVitals(result.data as any);
      } else {
        setError(toErrorMessage(result.error));
      }
    },
  }), [patient, appointment, vitals, isLoading, error, consultation?.id]);

  const queueProps = useMemo(() => ({
    doctorId: doctorId ?? user?.id ?? null,
    currentAppointmentId: appointment?.id ?? null,
  }), [doctorId, user?.id, appointment?.id]);

  const timerProps = useMemo(() => ({
    startedAt: consultation?.startedAt ?? null,
    slotStartTime: appointment?.appointmentDate && appointment?.time
      ? new Date(`${new Date(appointment.appointmentDate as any).toISOString().split('T')[0]}T${appointment.time}`)
      : undefined,
    slotDurationMinutes: appointment?.consultationDuration || 30,
  }), [consultation?.startedAt, appointment?.appointmentDate, appointment?.time, appointment?.consultationDuration]);

  const value = useMemo(() => ({
    appointment,
    patient,
    vitals,
    consultation,
    doctorId,
    notes,
    outcomeType,
    patientDecision,
    isLoading,
    error,
    workflowState,
    isInitializing,
    isReady,
    initializeSession,
    startSession: startConsultation,
    completeSession,
    resumeSession,
    cancelCompletion,
    switchToPatient,
    advanceQueue,
    sendHeartbeat,
    startConsultation,
    goToSurgeryPlanning,
    isActive,
    isReadOnly,
  }), [
    appointment, patient, vitals, consultation, doctorId, notes, outcomeType, patientDecision, isLoading, error,
    workflowState, isInitializing, isReady, isActive, isReadOnly,
    initializeSession, startConsultation, completeSession, resumeSession,
    cancelCompletion, switchToPatient, advanceQueue, sendHeartbeat, goToSurgeryPlanning,
  ]);

  return (
    <SessionContext.Provider value={value}>
      <BillingProvider>
        <DialogProvider>
          <TimerContextProvider {...timerProps}>
            <QueueContextProvider {...queueProps}>
              <PatientContextProvider {...patientProps}>
                <DocumentationProvider {...docsProps}>
                  {children}
                </DocumentationProvider>
              </PatientContextProvider>
            </QueueContextProvider>
          </TimerContextProvider>
        </DialogProvider>
      </BillingProvider>
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}

export function useSessionContextOpt() {
  return useContext(SessionContext);
}
