/**
 * Application Layer — Legacy Session Operations
 *
 * Frozen copy of session lifecycle logic extracted from ConsultationContext.
 * Used by SessionOperationsShim during the shim-first replacement migration.
 *
 * This class is FROZEN after creation. No modifications, no refactoring,
 * no bug fixes. Bug fixes go only to SessionService.
 */

import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import type { DraftStorage, DraftRecord, DraftResult, DraftDataResult } from '@/shared-kernel/interfaces/draft-storage';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

const DRAFT_STORAGE_KEY_PREFIX = 'consultation-draft-';

function makeDraftKey(appointmentId: number | string): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${appointmentId}`;
}

function isDraftDataResult<T>(result: DraftResult<T>): result is DraftDataResult<T> {
  return result.success === true && 'record' in result;
}

export interface LegacyInitializeResult {
  success: boolean;
  data?: {
    appointment: any;
    patient: any;
    vitals: any[];
    consultation: any;
    doctorId: string;
    workflowState: ConsultationWorkflowState;
    isDirty: boolean;
  };
  error?: string;
}

export interface LegacyStartResult {
  success: boolean;
  data?: {
    appointment: any;
    patient: any;
    consultation: any;
    doctorId: string;
    workflowState: ConsultationWorkflowState;
  };
  error?: string;
}

export class LegacySessionOperations {
  constructor(
    private readonly doctorApi: any,
    private readonly consultationApi: any,
    private readonly patientApi: any,
    private readonly draftStorage: DraftStorage<StructuredNotes>,
    private readonly parseLegacyNotes: (fullText: string) => StructuredNotes,
  ) {}

  async initializeSession(appointmentId: number, user: { id: string }, dispatch: (action: any) => void): Promise<LegacyInitializeResult> {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const [appointmentResponse, doctorResponse, consultationResponse] = await Promise.all([
        this.doctorApi.getAppointment(appointmentId),
        this.doctorApi.getDoctorByUserId(user.id),
        this.consultationApi.loadConsultation(appointmentId),
      ]);

      if (!appointmentResponse?.success || !appointmentResponse.data) {
        throw new Error('Appointment not found');
      }

      const apt = appointmentResponse.data;
      const doctorId = doctorResponse?.success && doctorResponse.data ? doctorResponse.data.id : user.id;

      const [patientResponse, vitalsResponse] = await Promise.all([
        this.patientApi.loadPatient(apt.patientId),
        this.patientApi.getPatientVitals(apt.patientId, appointmentId),
      ]);

      if (!patientResponse?.success || !patientResponse.data) {
        throw new Error('Patient not found');
      }

      let vitalsData: any[] = [];
      if (vitalsResponse?.success && vitalsResponse.data) {
        vitalsData = vitalsResponse.data;
      }

      let consultation = consultationResponse?.success ? consultationResponse.data : null;

      let notes: StructuredNotes = {};
      let isDirty = false;

      if (consultation?.notes?.structured) {
        notes = consultation.notes.structured;
      } else if (consultation?.notes?.fullText) {
        notes = this.parseLegacyNotes(consultation.notes.fullText);
      }

      const savedDraft = localStorage.getItem(`consultation-draft-${appointmentId}`);
      if (savedDraft && consultation?.updatedAt) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.timestamp && draft.structured) {
            const draftTime = new Date(draft.timestamp);
            const serverTime = new Date(consultation.updatedAt);
            if (draftTime > serverTime) {
              notes = draft.structured;
              isDirty = true;
            } else {
              localStorage.removeItem(`consultation-draft-${appointmentId}`);
            }
          }
        } catch (e) {
          localStorage.removeItem(`consultation-draft-${appointmentId}`);
        }
      }

      const hasActiveConsultation = consultation?.state === 'IN_PROGRESS';

      let workflowState: ConsultationWorkflowState;
      if (apt.status === 'COMPLETED' || apt.status === 'CANCELLED') {
        workflowState = ConsultationWorkflowState.READY;
      } else if (apt.status === 'IN_CONSULTATION' || hasActiveConsultation) {
        workflowState = ConsultationWorkflowState.ACTIVE;
      } else if (apt.status === 'CHECKED_IN' || apt.status === 'READY_FOR_CONSULTATION') {
        workflowState = ConsultationWorkflowState.READY;
      } else {
        workflowState = ConsultationWorkflowState.READY;
      }

      dispatch({ type: 'SET_DATA', payload: { appointment: apt, patient: patientResponse.data, vitals: vitalsData, doctorId } });
      if (consultation) {
        dispatch({ type: 'SET_CONSULTATION', payload: consultation });
      }
      dispatch({ type: 'SET_DIRTY', payload: isDirty });

      return {
        success: true,
        data: {
          appointment: apt,
          patient: patientResponse.data,
          vitals: vitalsData,
          consultation,
          doctorId,
          workflowState,
          isDirty,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load appointment' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  async startConsultation(appointmentId: number, doctorId: string, userId: string, user: { id: string }, dispatch: (action: any) => void): Promise<LegacyStartResult> {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = this.doctorApi.startConsultation({ appointmentId, doctorId, userId });

      if (!response.success) {
        const errorMsg = (response.error || '').toLowerCase();
        const isAlreadyStarted = errorMsg.includes('in progress') || errorMsg.includes('in_consultation') || errorMsg.includes('already');

        if (isAlreadyStarted) {
          const consultationResponse = await this.consultationApi.loadConsultation(appointmentId);
          if (consultationResponse?.success && consultationResponse.data) {
            return {
              success: true,
              data: {
                appointment: response.data,
                patient: null,
                consultation: consultationResponse.data,
                doctorId,
                workflowState: ConsultationWorkflowState.ACTIVE,
              },
            };
          }
        }
        return { success: false, error: response.error || 'Failed to start consultation' };
      }

      const consultationResponse = await this.consultationApi.loadConsultation(appointmentId);
      if (!consultationResponse?.success || !consultationResponse.data) {
        return { success: false, error: 'Consultation not found after start' };
      }

      return {
        success: true,
        data: {
          appointment: response.data,
          patient: null,
          consultation: consultationResponse.data,
          doctorId,
          workflowState: ConsultationWorkflowState.ACTIVE,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to start consultation' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  async completeConsultation(appointmentId: number, dispatch: (action: any) => void): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.TRANSITIONING });
      dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });

      localStorage.removeItem(`consultation-draft-${appointmentId}`);

      return {
        success: true,
        data: {
          completedAppointmentId: appointmentId,
          clearedLocalStorage: true,
          redirectPath: '/doctor/consultations',
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to complete consultation' };
    }
  }

  async switchToPatient(appointmentId: number, dispatch: (action: any) => void): Promise<{ success: boolean }> {
    try {
      dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.LOADING });
      localStorage.removeItem(`consultation-draft-${appointmentId}`);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendHeartbeat(consultationId: number): Promise<void> {
    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.post(`/consultations/${consultationId}/heartbeat`, {});
    } catch (error) {
      // Heartbeat failures are non-critical
    }
  }

  persistDraftBackup(appointmentId: number, notes: StructuredNotes): void {
    try {
      localStorage.setItem(
        `consultation-draft-${appointmentId}`,
        JSON.stringify({
          structured: notes,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Failed to persist draft backup:', error);
    }
  }
}
