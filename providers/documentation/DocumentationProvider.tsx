'use client';

/**
 * Presentation Layer — DocumentationProvider
 *
 * Owns the documentation editor for the appointment currently open in the room.
 * Notes, dirty state, and save results are bound to that appointment id.
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
  | { type: 'APPLY_ENCOUNTER'; payload: { notes: StructuredNotes; outcomeType: ConsultationOutcomeType | null; patientDecision: PatientDecision | null; resetStatus: boolean } };

const EMPTY_NOTES: StructuredNotes = {
  chiefComplaint: '',
  examination: '',
  assessment: '',
  plan: '',
};

function normalizeNotes(notes?: StructuredNotes | null): StructuredNotes {
  return {
    chiefComplaint: notes?.chiefComplaint ?? '',
    examination: notes?.examination ?? '',
    assessment: notes?.assessment ?? '',
    plan: notes?.plan ?? '',
  };
}

function notesEqual(left: StructuredNotes, right: StructuredNotes): boolean {
  const a = normalizeNotes(left);
  const b = normalizeNotes(right);
  return a.chiefComplaint === b.chiefComplaint
    && a.examination === b.examination
    && a.assessment === b.assessment
    && a.plan === b.plan;
}

function createInitialState(): DocumentationState {
  return {
    notes: { ...EMPTY_NOTES },
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

    case 'APPLY_ENCOUNTER':
      return {
        ...state,
        notes: action.payload.notes,
        outcomeType: action.payload.outcomeType,
        patientDecision: action.payload.patientDecision,
        isDirty: false,
        isSaving: action.payload.resetStatus ? false : state.isSaving,
        autoSaveStatus: action.payload.resetStatus ? 'idle' : state.autoSaveStatus,
      };

    default:
      return state;
  }
}

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

interface DocumentationProviderProps {
  children: ReactNode;
  appointmentId?: number | null;
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
  appointmentId,
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
  const resetStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const generationRef = useRef(0);
  const flightRef = useRef<Promise<void> | null>(null);
  const syncedAppointmentRef = useRef<{ id: number | null } | null>(null);
  const onSaveDraftRef = useRef(onSaveDraft);
  const onSaveNotesRef = useRef(onSaveNotes);
  const doctorIdRef = useRef(doctorId);
  const isCompletedRef = useRef(isCompleted);
  const consultationIdRef = useRef(consultationId);
  onSaveDraftRef.current = onSaveDraft;
  onSaveNotesRef.current = onSaveNotes;
  doctorIdRef.current = doctorId;
  isCompletedRef.current = isCompleted;
  consultationIdRef.current = consultationId;

  const canSave = state.isDirty;

  const scheduleIdle = useCallback(() => {
    if (resetStatusTimeoutRef.current) clearTimeout(resetStatusTimeoutRef.current);
    resetStatusTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' });
    }, 2000);
  }, []);

  useEffect(() => {
    const nextId = appointmentId ?? null;
    const normalized = normalizeNotes(notes);
    const nextOutcome = outcomeType ?? null;
    const nextDecision = patientDecision ?? null;
    const appointmentChanged = !syncedAppointmentRef.current || syncedAppointmentRef.current.id !== nextId;

    if (!appointmentChanged) {
      if (stateRef.current.isDirty) return;
      const sameNotes = notesEqual(stateRef.current.notes, normalized);
      const sameOutcome = stateRef.current.outcomeType === nextOutcome;
      const sameDecision = stateRef.current.patientDecision === nextDecision;
      if (sameNotes && sameOutcome && sameDecision) return;
      dispatch({
        type: 'APPLY_ENCOUNTER',
        payload: { notes: normalized, outcomeType: nextOutcome, patientDecision: nextDecision, resetStatus: false },
      });
      return;
    }

    syncedAppointmentRef.current = { id: nextId };
    generationRef.current += 1;
    dispatch({
      type: 'APPLY_ENCOUNTER',
      payload: { notes: normalized, outcomeType: nextOutcome, patientDecision: nextDecision, resetStatus: true },
    });
  }, [appointmentId, notes, outcomeType, patientDecision]);

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

  const persistDraftOnce = useCallback(async () => {
    const generation = generationRef.current;
    const snapshot = stateRef.current;
    if (!snapshot.isDirty) return;
    if (!doctorIdRef.current || !onSaveDraftRef.current) {
      if (generation === generationRef.current) {
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
      }
      throw new Error('Unable to save this consultation');
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' });

    try {
      const response = await onSaveDraftRef.current(snapshot.notes, snapshot.outcomeType, snapshot.patientDecision);
      if (generation !== generationRef.current) {
        throw new Error('Consultation changed before the save finished');
      }
      const current = stateRef.current;
      const sameVersion = notesEqual(current.notes, snapshot.notes)
        && current.outcomeType === snapshot.outcomeType
        && current.patientDecision === snapshot.patientDecision;
      if (sameVersion) {
        stateRef.current = {
          ...current,
          isDirty: false,
          isSaving: false,
          lastSavedAt: response.version,
          autoSaveStatus: 'saved',
        };
        dispatch({ type: 'SET_DIRTY', payload: false });
        dispatch({ type: 'SET_LAST_SAVED', payload: response.version });
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
        scheduleIdle();
      }
    } catch (error) {
      if (generation === generationRef.current) {
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
      }
      throw error instanceof Error ? error : new Error('Failed to save draft');
    } finally {
      if (generation === generationRef.current) {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    }
  }, [scheduleIdle]);

  const saveDraft = useCallback(() => {
    if (flightRef.current) return flightRef.current;

    let resolveFlight: () => void = () => undefined;
    let rejectFlight: (error: unknown) => void = () => undefined;
    const flight = new Promise<void>((resolve, reject) => {
      resolveFlight = resolve;
      rejectFlight = reject;
    });
    flightRef.current = flight;

    void (async () => {
      try {
        let attempts = 0;
        while (stateRef.current.isDirty) {
          if (attempts >= 3) {
            throw new Error('The note is still unsaved');
          }
          attempts += 1;
          await persistDraftOnce();
        }
        resolveFlight();
      } catch (error) {
        rejectFlight(error);
      } finally {
        if (flightRef.current === flight) {
          flightRef.current = null;
        }
      }
    })();

    return flight;
  }, [persistDraftOnce]);

  const saveNotes = useCallback(async () => {
    if (!stateRef.current.isDirty) return;
    const generation = generationRef.current;
    const snapshot = stateRef.current;

    if (isCompletedRef.current && consultationIdRef.current && doctorIdRef.current && onSaveNotesRef.current) {
      dispatch({ type: 'SET_SAVING', payload: true });
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' });
      try {
        const result = await onSaveNotesRef.current(snapshot.notes);
        if (!result.success) {
          throw new Error('Failed to save notes');
        }
        if (generation !== generationRef.current) {
          throw new Error('Consultation changed before the save finished');
        }
        if (notesEqual(stateRef.current.notes, snapshot.notes)) {
          dispatch({ type: 'SET_DIRTY', payload: false });
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
          dispatch({ type: 'SET_LAST_SAVED', payload: new Date().toISOString() });
          scheduleIdle();
        }
      } catch (error) {
        if (generation === generationRef.current) {
          dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
          toast.error('Failed to save notes');
        }
        throw error instanceof Error ? error : new Error('Failed to save notes');
      } finally {
        if (generation === generationRef.current) {
          dispatch({ type: 'SET_SAVING', payload: false });
        }
      }
      return;
    }

    await saveDraft();
  }, [saveDraft, scheduleIdle]);

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

export function useDocumentationContext() {
  const context = useContext(DocumentationContext);
  if (!context) {
    throw new Error(
      'useDocumentationContext must be used within DocumentationProvider'
    );
  }
  return context;
}
