'use client';

/**
 * Consultation Context
 * 
 * Centralized state management for the consultation workflow.
 * Decouples data fetching, state management, and UI.
 * 
 * Responsibilities:
 * - Fetch and cache appointment/patient/consultation data
 * - Manage workflow state transitions
 * - Handle auto-save with debouncing
 * - Track dirty state and unsaved changes
 * - Provide actions for UI components
 * 
 * This context should be the SINGLE SOURCE OF TRUTH for:
 * - Current patient/appointment being consulted
 * - Consultation notes state
 * - Workflow state (loading, active, completing, etc.)
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect,
  useRef,
  useMemo,
  type ReactNode 
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { debounce } from 'lodash';

import { doctorApi } from '@/lib/api/doctor';
import { consultationApi } from '@/lib/api/consultation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorTodayAppointments } from '@/hooks/doctor/useDoctorDashboard';
import { useConsultation } from '@/hooks/consultation/useConsultation';
import { useSaveConsultationDraft } from '@/hooks/consultation/useSaveConsultationDraft';

import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import {
  ConsultationWorkflowState,
  ConsultationWorkflowAction,
  getNextState,
  canPerformAction,
  createInitialContext,
  type ConsultationWorkflowContext,
} from '@/domain/workflows/ConsultationWorkflowState';

import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

// ============================================================================
// TYPES
// ============================================================================

export interface StructuredNotes {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}

interface ConsultationProviderState {
  // Workflow state
  workflow: ConsultationWorkflowContext;
  
  // Data (null when not loaded)
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  
  // Notes state (local, synced via auto-save)
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  
  // UI state
  isLoading: boolean;
  isSaving: boolean;
  showCompleteDialog: boolean;
  showStartDialog: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

type ConsultationAction =
  | { type: 'SET_WORKFLOW_STATE'; payload: ConsultationWorkflowState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { appointment: AppointmentResponseDto; patient: PatientResponseDto; doctorId: string } }
  | { type: 'SET_CONSULTATION'; payload: ConsultationResponseDto | null }
  | { type: 'SET_NOTES'; payload: StructuredNotes }
  | { type: 'UPDATE_NOTE_FIELD'; payload: { field: keyof StructuredNotes; value: string } }
  | { type: 'SET_OUTCOME'; payload: ConsultationOutcomeType }
  | { type: 'SET_PATIENT_DECISION'; payload: PatientDecision }
  | { type: 'SET_AUTO_SAVE_STATUS'; payload: 'idle' | 'saving' | 'saved' | 'error' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SHOW_COMPLETE_DIALOG'; payload: boolean }
  | { type: 'SHOW_START_DIALOG'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ============================================================================
// REDUCER
// ============================================================================

function consultationReducer(state: ConsultationProviderState, action: ConsultationAction): ConsultationProviderState {
  switch (action.type) {
    case 'SET_WORKFLOW_STATE':
      return {
        ...state,
        workflow: { ...state.workflow, state: action.payload },
      };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
      
    case 'SET_DATA':
      return {
        ...state,
        appointment: action.payload.appointment,
        patient: action.payload.patient,
        doctorId: action.payload.doctorId,
        workflow: {
          ...state.workflow,
          appointmentId: action.payload.appointment.id,
          patientId: action.payload.patient.id,
        },
      };
      
    case 'SET_CONSULTATION':
      return {
        ...state,
        consultation: action.payload,
        workflow: {
          ...state.workflow,
          consultationId: action.payload?.id ?? null,
        },
      };
      
    case 'SET_NOTES':
      return {
        ...state,
        notes: action.payload,
        workflow: { ...state.workflow, isDirty: true },
      };
      
    case 'UPDATE_NOTE_FIELD':
      return {
        ...state,
        notes: { ...state.notes, [action.payload.field]: action.payload.value },
        workflow: { ...state.workflow, isDirty: true },
      };
      
    case 'SET_OUTCOME':
      return { ...state, outcomeType: action.payload };
      
    case 'SET_PATIENT_DECISION':
      return { ...state, patientDecision: action.payload };
      
    case 'SET_AUTO_SAVE_STATUS':
      return { ...state, autoSaveStatus: action.payload };
      
    case 'SET_DIRTY':
      return {
        ...state,
        workflow: { ...state.workflow, isDirty: action.payload },
      };
      
    case 'SHOW_COMPLETE_DIALOG':
      return { ...state, showCompleteDialog: action.payload };
      
    case 'SHOW_START_DIALOG':
      return { ...state, showStartDialog: action.payload };
      
    case 'SET_ERROR':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          state: ConsultationWorkflowState.ERROR,
          error: action.payload,
        },
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        workflow: { ...state.workflow, error: null },
      };
      
    case 'RESET':
      return createInitialState();
      
    default:
      return state;
  }
}

function createInitialState(appointmentId?: number): ConsultationProviderState {
  return {
    workflow: createInitialContext(appointmentId),
    appointment: null,
    patient: null,
    consultation: null,
    doctorId: null,
    notes: {},
    outcomeType: null,
    patientDecision: null,
    isLoading: false,
    isSaving: false,
    showCompleteDialog: false,
    showStartDialog: false,
    autoSaveStatus: 'idle',
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ConsultationContextValue {
  // State
  state: ConsultationProviderState;
  
  // Computed
  isActive: boolean;
  isReadOnly: boolean;
  canSave: boolean;
  canComplete: boolean;
  waitingQueue: AppointmentResponseDto[];
  
  // Actions
  loadAppointment: (appointmentId: number) => Promise<void>;
  startConsultation: () => Promise<void>;
  saveDraft: () => Promise<void>;
  updateNotes: (field: keyof StructuredNotes, value: string) => void;
  setOutcome: (outcome: ConsultationOutcomeType) => void;
  setPatientDecision: (decision: PatientDecision) => void;
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  completeConsultation: (redirectPath?: string) => Promise<void>;
  switchToPatient: (appointmentId: number) => void;
  goToSurgeryPlanning: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ConsultationProviderProps {
  children: ReactNode;
  initialAppointmentId?: number;
}

export function ConsultationProvider({ children, initialAppointmentId }: ConsultationProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [state, dispatch] = useReducer(
    consultationReducer,
    createInitialState(initialAppointmentId)
  );
  
  // External hooks
  const saveDraftMutation = useSaveConsultationDraft();
  const { data: todayAppointments = [] } = useDoctorTodayAppointments(user?.id, !!user);
  
  // Refs for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Waiting queue (excluding current appointment)
  const waitingQueue = useMemo(() => {
    return todayAppointments.filter(apt => 
      apt.id !== state.appointment?.id &&
      (apt.status === AppointmentStatus.CHECKED_IN || 
       apt.status === AppointmentStatus.READY_FOR_CONSULTATION)
    );
  }, [todayAppointments, state.appointment?.id]);
  
  // Computed properties
  const isActive = state.consultation?.state === ConsultationState.IN_PROGRESS;
  const isReadOnly = state.consultation?.state === ConsultationState.COMPLETED;
  const canSave = isActive && state.workflow.isDirty;
  const canComplete = isActive && !state.isSaving;
  
  // ========== ACTIONS ==========
  
  const loadAppointment = useCallback(async (appointmentId: number) => {
    if (!user) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.LOADING });
    
    try {
      // Load appointment
      const appointmentResponse = await doctorApi.getAppointment(appointmentId);
      if (!appointmentResponse.success || !appointmentResponse.data) {
        throw new Error('Appointment not found');
      }
      
      const apt = appointmentResponse.data;
      
      // Load patient
      const patientResponse = await doctorApi.getPatient(apt.patientId);
      if (!patientResponse.success || !patientResponse.data) {
        throw new Error('Patient not found');
      }
      
      // Get doctor ID
      const doctorResponse = await doctorApi.getDoctorByUserId(user.id);
      const doctorId = doctorResponse.success && doctorResponse.data 
        ? doctorResponse.data.id 
        : user.id;
      
      dispatch({ 
        type: 'SET_DATA', 
        payload: { 
          appointment: apt, 
          patient: patientResponse.data,
          doctorId,
        } 
      });
      
      // Load consultation if exists
      const consultationResponse = await consultationApi.getConsultation(appointmentId);
      if (consultationResponse.success && consultationResponse.data) {
        dispatch({ type: 'SET_CONSULTATION', payload: consultationResponse.data });
        
        // Restore notes from consultation
        if (consultationResponse.data.notes?.structured) {
          dispatch({ type: 'SET_NOTES', payload: consultationResponse.data.notes.structured });
        }
        
        // Restore outcome/decision
        if (consultationResponse.data.outcomeType) {
          dispatch({ type: 'SET_OUTCOME', payload: consultationResponse.data.outcomeType });
        }
        if (consultationResponse.data.patientDecision) {
          dispatch({ type: 'SET_PATIENT_DECISION', payload: consultationResponse.data.patientDecision });
        }
      }
      
      // Determine workflow state based on appointment/consultation status.
      // If the appointment is already IN_CONSULTATION, go straight to the 
      // workspace — no start dialog. This is the normal path when navigating
      // from a "Start Consultation" button that already called the API.
      const hasActiveConsultation = consultationResponse.success && 
        consultationResponse.data?.state === ConsultationState.IN_PROGRESS;
      
      if (apt.status === AppointmentStatus.IN_CONSULTATION || hasActiveConsultation) {
        dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
        // Explicitly ensure the dialog is closed (defensive)
        dispatch({ type: 'SHOW_START_DIALOG', payload: false });
      } else if (apt.status === AppointmentStatus.CHECKED_IN || 
                 apt.status === AppointmentStatus.READY_FOR_CONSULTATION) {
        dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.READY });
        dispatch({ type: 'SHOW_START_DIALOG', payload: true });
      } else {
        dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.READY });
      }
      
      dispatch({ type: 'SET_DIRTY', payload: false });
      
    } catch (error: any) {
      console.error('Failed to load appointment:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load appointment' });
      toast.error(error.message || 'Failed to load appointment');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);
  
  const startConsultation = useCallback(async () => {
    if (!user || !state.appointment) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await doctorApi.startConsultation({
        appointmentId: state.appointment.id,
        doctorId: state.doctorId || user.id,
        userId: user.id,
      });
      
      if (!response.success) {
        // Handle "already in progress" gracefully — another code path
        // (dashboard, appointment detail) may have started it first.
        const errorMsg = (response.error || '').toLowerCase();
        const isAlreadyStarted = errorMsg.includes('in progress') || 
                                 errorMsg.includes('in_consultation') ||
                                 errorMsg.includes('already');
        
        if (isAlreadyStarted) {
          // Not an error — just proceed to the workspace
          console.info('[ConsultationContext] Consultation already in progress, proceeding to workspace');
        } else {
          throw new Error(response.error || 'Failed to start consultation');
        }
      }
      
      // Refresh consultation data regardless (it may exist from a prior start)
      const consultationResponse = await consultationApi.getConsultation(state.appointment.id);
      if (consultationResponse.success && consultationResponse.data) {
        dispatch({ type: 'SET_CONSULTATION', payload: consultationResponse.data });
      }
      
      dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
      dispatch({ type: 'SHOW_START_DIALOG', payload: false });
      
      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['doctor', user.id, 'appointments'] });
      
      toast.success('Consultation started');
      
    } catch (error: any) {
      console.error('Failed to start consultation:', error);
      toast.error(error.message || 'Failed to start consultation');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, state.appointment, state.doctorId, queryClient]);
  
  const saveDraft = useCallback(async () => {
    if (!state.appointment || !state.doctorId || !state.consultation || !canSave) return;
    
    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' });
    
    try {
      await saveDraftMutation.mutateAsync({
        appointmentId: state.appointment.id,
        doctorId: state.doctorId,
        notes: {
          rawText: generateFullText(state.notes),
          structured: state.notes,
        },
      });
      
      dispatch({ type: 'SET_DIRTY', payload: false });
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
      
      // Reset status after 2 seconds
      setTimeout(() => {
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' });
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.appointment, state.doctorId, state.consultation, state.notes, canSave, saveDraftMutation]);
  
  const updateNotes = useCallback((field: keyof StructuredNotes, value: string) => {
    dispatch({ type: 'UPDATE_NOTE_FIELD', payload: { field, value } });
  }, []);
  
  const setOutcome = useCallback((outcome: ConsultationOutcomeType) => {
    dispatch({ type: 'SET_OUTCOME', payload: outcome });
  }, []);
  
  const setPatientDecision = useCallback((decision: PatientDecision) => {
    dispatch({ type: 'SET_PATIENT_DECISION', payload: decision });
  }, []);
  
  const openCompleteDialog = useCallback(() => {
    dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: true });
    dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.COMPLETING });
  }, []);
  
  const closeCompleteDialog = useCallback(() => {
    dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });
    dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
  }, []);
  
  const completeConsultation = useCallback(async (redirectPath?: string) => {
    if (!state.appointment) return;
    
    dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.TRANSITIONING });
    dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['consultation', state.appointment.id] });
    queryClient.invalidateQueries({ queryKey: ['doctor'] });
    
    // Navigate
    if (redirectPath) {
      router.push(redirectPath);
    } else if (waitingQueue.length > 0) {
      // Go to next patient
      router.push(`/doctor/consultations/${waitingQueue[0].id}/session`);
    } else {
      router.push('/doctor/appointments');
    }
  }, [state.appointment, waitingQueue, queryClient, router]);
  
  const switchToPatient = useCallback((appointmentId: number) => {
    if (state.workflow.isDirty) {
      // Save before switching
      saveDraft().then(() => {
        router.push(`/doctor/consultations/${appointmentId}/session`);
      });
    } else {
      router.push(`/doctor/consultations/${appointmentId}/session`);
    }
  }, [state.workflow.isDirty, saveDraft, router]);
  
  const goToSurgeryPlanning = useCallback(() => {
    if (!state.appointment) return;
    router.push(`/doctor/operative/plan/${state.appointment.id}/new`);
  }, [state.appointment, router]);
  
  // ========== EFFECTS ==========
  
  // Auto-save with debouncing
  useEffect(() => {
    if (!isActive || !state.workflow.isDirty) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (3 seconds)
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.notes, isActive, state.workflow.isDirty, saveDraft]);
  
  // Load initial appointment
  useEffect(() => {
    if (initialAppointmentId && user) {
      loadAppointment(initialAppointmentId);
    }
  }, [initialAppointmentId, user, loadAppointment]);
  
  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.workflow.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.workflow.isDirty]);
  
  // ========== CONTEXT VALUE ==========
  
  const value: ConsultationContextValue = {
    state,
    isActive,
    isReadOnly,
    canSave,
    canComplete,
    waitingQueue,
    loadAppointment,
    startConsultation,
    saveDraft,
    updateNotes,
    setOutcome,
    setPatientDecision,
    openCompleteDialog,
    closeCompleteDialog,
    completeConsultation,
    switchToPatient,
    goToSurgeryPlanning,
  };
  
  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useConsultationContext() {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultationContext must be used within ConsultationProvider');
  }
  return context;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateFullText(notes: StructuredNotes): string {
  const parts: string[] = [];
  
  if (notes.chiefComplaint) {
    parts.push(`Chief Complaint: ${notes.chiefComplaint}`);
  }
  if (notes.examination) {
    parts.push(`Examination: ${notes.examination}`);
  }
  if (notes.assessment) {
    parts.push(`Assessment: ${notes.assessment}`);
  }
  if (notes.plan) {
    parts.push(`Plan: ${notes.plan}`);
  }
  
  return parts.join('\n\n');
}
