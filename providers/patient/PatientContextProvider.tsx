'use client';

/**
 * Presentation Layer — PatientContextProvider
 *
 * Owns the patient context state for the active consultation:
 * - Current patient demographics and profile
 * - Current appointment details
 * - Patient vitals for the current appointment
 * - Loading and error state for patient data
 * - Refresh operations for patient, appointment, and vitals
 *
 * This provider is the single source of truth for all patient-context UI state.
 * No other provider, context, or component may duplicate patient state.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import type { PatientResponse, AppointmentResponse } from '@/domain/interfaces/services/PatientApi';
import type { ClinicalError } from '@/shared-kernel/errors/types';

// ============================================================================
// TYPES
// ============================================================================

export interface VitalsData {
  bodyTemperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: string | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  recordedAt: string;
  recordedBy: string | null;
}

interface PatientContextState {
  patient: PatientResponse | null;
  appointment: AppointmentResponse | null;
  vitals: VitalsData | null;
  isLoading: boolean;
  error: string | null;
}

type PatientContextAction =
  | { type: 'SET_PATIENT'; payload: PatientResponse | null }
  | { type: 'SET_APPOINTMENT'; payload: AppointmentResponse | null }
  | { type: 'SET_VITALS'; payload: VitalsData | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

// ============================================================================
// REDUCER
// ============================================================================

function createInitialState(): PatientContextState {
  return {
    patient: null,
    appointment: null,
    vitals: null,
    isLoading: false,
    error: null,
  };
}

function patientContextReducer(
  state: PatientContextState,
  action: PatientContextAction
): PatientContextState {
  switch (action.type) {
    case 'SET_PATIENT':
      return { ...state, patient: action.payload };
    case 'SET_APPOINTMENT':
      return { ...state, appointment: action.payload };
    case 'SET_VITALS':
      return { ...state, vitals: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PatientContextValue {
  patient: PatientResponse | null;
  appointment: AppointmentResponse | null;
  vitals: VitalsData | null;
  isLoading: boolean;
  error: string | null;
  refreshPatient: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshVitals: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface PatientContextProviderProps {
  children: ReactNode;
  patient: PatientResponse | null;
  appointment: AppointmentResponse | null;
  vitals: VitalsData | null;
  isLoading: boolean;
  error: string | null;
  consultationId?: number | null;
  onRefreshPatient?: (patientId: string) => Promise<void>;
  onRefreshAppointments?: (patientId: string) => Promise<void>;
  onRefreshVitals?: (patientId: string, consultationId: number) => Promise<void>;
}

export function PatientContextProvider({
  children,
  patient,
  appointment,
  vitals,
  isLoading,
  error,
  consultationId,
  onRefreshPatient,
  onRefreshAppointments,
  onRefreshVitals,
}: PatientContextProviderProps) {
  const [state, dispatch] = useReducer(patientContextReducer, createInitialState());

  useEffect(() => {
    dispatch({ type: 'SET_PATIENT', payload: patient });
  }, [patient]);

  useEffect(() => {
    dispatch({ type: 'SET_APPOINTMENT', payload: appointment });
  }, [appointment]);

  useEffect(() => {
    dispatch({ type: 'SET_VITALS', payload: vitals });
  }, [vitals]);

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [isLoading]);

  useEffect(() => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [error]);

  const refreshPatient = useCallback(async () => {
    if (!patient?.id || !onRefreshPatient) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await onRefreshPatient(patient.id);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to refresh patient' });
      toast.error(err.message || 'Failed to refresh patient');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [patient?.id, onRefreshPatient]);

  const refreshAppointments = useCallback(async () => {
    if (!patient?.id || !onRefreshAppointments) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await onRefreshAppointments(patient.id);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to refresh appointments' });
      toast.error(err.message || 'Failed to refresh appointments');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [patient?.id, onRefreshAppointments]);

  const refreshVitals = useCallback(async () => {
    if (!patient?.id || !consultationId || !onRefreshVitals) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await onRefreshVitals(patient.id, consultationId);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to refresh vitals' });
      toast.error(err.message || 'Failed to refresh vitals');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [patient?.id, consultationId, onRefreshVitals]);

  const value = useMemo(
    () => ({
      patient: state.patient,
      appointment: state.appointment,
      vitals: state.vitals,
      isLoading: state.isLoading,
      error: state.error,
      refreshPatient,
      refreshAppointments,
      refreshVitals,
    }),
    [state, refreshPatient, refreshAppointments, refreshVitals]
  );

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error(
      'usePatientContext must be used within PatientContextProvider'
    );
  }
  return context;
}
