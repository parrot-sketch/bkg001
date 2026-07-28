'use client';

/**
 * Presentation Layer — DocumentationProvider
 *
 * Owns the complete documentation state lifecycle for an active consultation:
 * - Structured notes (SOAP: subjective, objective, assessment, plan)
 * - Consultation outcome and patient decision
 * - Dirty tracking, save status, auto-save debounce
 * - Draft persistence via DraftService
 * - Completed-consultation notes save
 *
 * This provider is the single source of truth for all documentation UI state.
 * No other provider, context, or component may duplicate notes state or save logic.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import type { ClinicalError } from '@/shared-kernel/errors/types';

import { saveDraft, saveCompletedNotes } from '@/actions/doctor/consultation-session';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentationState {
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isDirty: boolean;
  isSaving: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
  hasConflict: boolean;
}

type DocumentationAction =
  | { type: 'UPDATE_NOTE_FIELD'; payload: { field: keyof StructuredNotes; value: string } }
  | { type: 'SET_OUTCOME'; payload: ConsultationOutcomeType }
  | { type: 'SET_PATIENT_DECISION'; payload: PatientDecision | null }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_STATUS'; payload: 'idle' | 'saving' | 'saved' | 'error' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: string | null }
  | { type: 'SET_CONFLICT'; payload: boolean }
  | { type: 'SET_NOTES'; payload: StructuredNotes }
  | { type: 'RESET_NOTES' };

// ============================================================================
// REDUCER
// ============================================================================

function createInitialState(): DocumentationState {
  return {
    notes: {} as StructuredNotes,
    outcomeType: null,
    patientDecision: null,
    isDirty: false,
    isSaving: false,
    autoSaveStatus: 'idle',
    lastSavedAt: null,
    hasConflict: false,
  };
}

function documentationReducer(
  state: DocumentationState,
  action: DocumentationAction
): DocumentationState {
  switch (action.type) {
    case 'UPDATE_NOTE_FIELD':
      if (state.notes[action.payload.field] === action.payload.value) {
        return state;
      }
      return {
        ...state,
        notes: { ...state.notes, [action.payload.field]: action.payload.value },
        isDirty: true,
      };

    case 'SET_OUTCOME':
      if (state.outcomeType === action.payload) {
        return state;
      }
      return {
        ...state,
        outcomeType: action.payload,
        isDirty: true,
      };

    case 'SET_PATIENT_DECISION':
      if (state.patientDecision === action.payload) {
        return state;
      }
      return {
        ...state,
        patientDecision: action.payload,
        isDirty: true,
      };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_AUTO_SAVE_STATUS':
      return { ...state, autoSaveStatus: action.payload };

    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };

    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.payload };

    case 'SET_CONFLICT':
      return { ...state, hasConflict: action.payload };

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'RESET_NOTES':
      return createInitialState();

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface DocumentationContextValue {
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isDirty: boolean;
  isSaving: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
  hasConflict: boolean;
  canSave: boolean;
  updateNotes: (field: keyof StructuredNotes, value: string) => void;
  setOutcome: (outcome: ConsultationOutcomeType) => void;
  setPatientDecision: (decision: PatientDecision | null) => void;
  saveDraft: () => Promise<void>;
  saveNotes: () => Promise<void>;
}

const DocumentationContext = createContext<DocumentationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DocumentationProviderProps {
  children: ReactNode;
  consultationId?: number | null;
  doctorId?: string | null;
  isCompleted?: boolean;
  notes?: StructuredNotes;
  outcomeType?: ConsultationOutcomeType | null;
  patientDecision?: PatientDecision | null;
  onSaveDraft?: (notes: StructuredNotes, outcomeType: ConsultationOutcomeType | null, patientDecision: PatientDecision | null) => Promise<{ success: true; version: string }>;
  onSaveNotes?: (notes: StructuredNotes) => Promise<{ success: true }>;
}

export function DocumentationProvider({
  children,
  consultationId,
  doctorId,
  isCompleted = false,
  notes,
  outcomeType,
  patientDecision,
  onSaveDraft,
  onSaveNotes,
}: DocumentationProviderProps) {
  const [state, dispatch] = useReducer(documentationReducer, createInitialState());
  const resetStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canSave = state.isDirty;

  const lastSyncedConsultationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (consultationId && consultationId !== lastSyncedConsultationIdRef.current) {
      lastSyncedConsultationIdRef.current = consultationId;
      if (notes && Object.keys(notes).length > 0) {
        dispatch({ type: 'SET_NOTES', payload: notes });
      }
      if (outcomeType !== undefined && outcomeType !== null && state.outcomeType !== outcomeType) {
        dispatch({ type: 'SET_OUTCOME', payload: outcomeType });
      }
      if (patientDecision !== undefined && state.patientDecision !== patientDecision) {
        dispatch({ type: 'SET_PATIENT_DECISION', payload: patientDecision });
      }
    }
  }, [consultationId, notes, outcomeType, patientDecision, state.outcomeType, state.patientDecision]);

  const updateNotes = useCallback((field: keyof StructuredNotes, value: string) => {
    dispatch({ type: 'UPDATE_NOTE_FIELD', payload: { field, value } });
  }, []);

  const setOutcome = useCallback((outcome: ConsultationOutcomeType) => {
    dispatch({ type: 'SET_OUTCOME', payload: outcome });
    if (outcome === ConsultationOutcomeType.PROCEDURE_RECOMMENDED) {
      dispatch({ type: 'SET_PATIENT_DECISION', payload: PatientDecision.YES });
    } else {
      dispatch({ type: 'SET_PATIENT_DECISION', payload: null });
    }
  }, []);

  const setPatientDecision = useCallback((decision: PatientDecision | null) => {
    dispatch({ type: 'SET_PATIENT_DECISION', payload: decision });
  }, []);

  const saveDraft = useCallback(async () => {
    if (!state.isDirty || !doctorId || !onSaveDraft) {
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
      return;
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' });

    try {
      const response = await onSaveDraft(state.notes, state.outcomeType, state.patientDecision);

      dispatch({ type: 'SET_DIRTY', payload: false });
      dispatch({ type: 'SET_LAST_SAVED', payload: response.version });
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });

      if (resetStatusTimeoutRef.current) clearTimeout(resetStatusTimeoutRef.current);
      resetStatusTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [
    state.isDirty,
    state.notes,
    state.outcomeType,
    state.patientDecision,
    consultationId,
    doctorId,
    onSaveDraft,
  ]);

  const saveNotes = useCallback(async () => {
    if (!state.isDirty) return;

    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' });

    try {
      if (isCompleted && consultationId && doctorId && onSaveNotes) {
        const result = await onSaveNotes(state.notes);

        if (result.success) {
          dispatch({ type: 'SET_DIRTY', payload: false });
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
          dispatch({ type: 'SET_LAST_SAVED', payload: new Date().toISOString() });
          if (resetStatusTimeoutRef.current) clearTimeout(resetStatusTimeoutRef.current);
          resetStatusTimeoutRef.current = setTimeout(() => {
            dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' });
          }, 2000);
        } else {
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
          toast.error('Failed to save notes');
        }
      } else if (onSaveDraft) {
        const response = await onSaveDraft(
          state.notes,
          state.outcomeType ?? null,
          state.patientDecision ?? null
        );

        if (response.success) {
          dispatch({ type: 'SET_DIRTY', payload: false });
          dispatch({ type: 'SET_LAST_SAVED', payload: response.version });
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });

          if (resetStatusTimeoutRef.current) clearTimeout(resetStatusTimeoutRef.current);
          resetStatusTimeoutRef.current = setTimeout(() => {
            dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' });
          }, 2000);
        } else {
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [
    state.isDirty,
    state.notes,
    state.outcomeType,
    state.patientDecision,
    isCompleted,
    consultationId,
    doctorId,
    onSaveDraft,
    onSaveNotes,
  ]);

  useEffect(() => {
    return () => {
      if (resetStatusTimeoutRef.current) {
        clearTimeout(resetStatusTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      notes: state.notes,
      outcomeType: state.outcomeType,
      patientDecision: state.patientDecision,
      isDirty: state.isDirty,
      isSaving: state.isSaving,
      autoSaveStatus: state.autoSaveStatus,
      lastSavedAt: state.lastSavedAt,
      hasConflict: state.hasConflict,
      canSave,
      updateNotes,
      setOutcome,
      setPatientDecision,
      saveDraft,
      saveNotes,
    }),
    [state, canSave, updateNotes, setOutcome, setPatientDecision, saveDraft, saveNotes]
  );

  return (
    <DocumentationContext.Provider value={value}>
      {children}
    </DocumentationContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useDocumentationContext() {
  const context = useContext(DocumentationContext);
  if (!context) {
    throw new Error(
      'useDocumentationContext must be used within DocumentationProvider'
    );
  }
  return context;
}
