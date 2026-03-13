/**
 * Consultation Reducer - Pure State Logic
 * 
 * Single responsibility: handles all state transitions for consultation.
 * No side effects, API calls, or external dependencies.
 */

import {
  ConsultationWorkflowState,
  ConsultationWorkflowContext,
  createInitialContext,
} from '@/domain/workflows/ConsultationWorkflowState';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { StructuredNotes } from './ConsultationContext';
import { PatientDecision } from '@/domain/enums/PatientDecision';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsultationProviderState {
  workflow: ConsultationWorkflowContext;
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | number | null;
  notes: StructuredNotes;
  outcomeType: string | null;
  patientDecision: PatientDecision | null;
  isLoading: boolean;
  isSaving: boolean;
  showCompleteDialog: boolean;
  showStartDialog: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export type ConsultationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { appointment: AppointmentResponseDto; patient: PatientResponseDto; doctorId: string | number } }
  | { type: 'SET_CONSULTATION'; payload: ConsultationResponseDto }
  | { type: 'SET_NOTES'; payload: StructuredNotes }
  | { type: 'UPDATE_NOTE_FIELD'; payload: { field: keyof StructuredNotes; value: string } }
  | { type: 'SET_OUTCOME'; payload: string | null }
  | { type: 'SET_PATIENT_DECISION'; payload: PatientDecision | null }
  | { type: 'SET_AUTO_SAVE_STATUS'; payload: 'idle' | 'saving' | 'saved' | 'error' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SHOW_COMPLETE_DIALOG'; payload: boolean }
  | { type: 'SHOW_START_DIALOG'; payload: boolean }
  | { type: 'SET_WORKFLOW_STATE'; payload: ConsultationWorkflowState }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(appointmentId?: number): ConsultationProviderState {
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
// REDUCER
// ============================================================================

export function consultationReducer(
  state: ConsultationProviderState,
  action: ConsultationAction
): ConsultationProviderState {
  switch (action.type) {
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
        workflow: { ...state.workflow, isDirty: false },
      };

    case 'SET_CONSULTATION':
      return {
        ...state,
        consultation: action.payload,
        workflow: { ...state.workflow, isDirty: false },
      };

    case 'SET_NOTES':
      return {
        ...state,
        notes: action.payload,
        workflow: { ...state.workflow, isDirty: false },
      };

    case 'UPDATE_NOTE_FIELD':
      return {
        ...state,
        notes: { ...state.notes, [action.payload.field]: action.payload.value },
        workflow: { ...state.workflow, isDirty: true },
      };

    case 'SET_OUTCOME':
      if (state.outcomeType === action.payload) {
        return state;
      }
      return {
        ...state,
        outcomeType: action.payload,
        workflow: { ...state.workflow, isDirty: true },
      };

    case 'SET_PATIENT_DECISION':
      if (state.patientDecision === action.payload) {
        return state;
      }
      return {
        ...state,
        patientDecision: action.payload,
        workflow: { ...state.workflow, isDirty: true },
      };

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

    case 'SET_WORKFLOW_STATE':
      return {
        ...state,
        workflow: { ...state.workflow, state: action.payload },
      };

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
