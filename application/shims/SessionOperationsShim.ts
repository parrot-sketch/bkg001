/**
 * Application Layer — Session Operations Shim
 *
 * Migration shim for SessionService extraction.
 * Routes session lifecycle calls to either SessionService or LegacySessionOperations
 * based on the USE_SESSION_SERVICE feature flag.
 *
 * This is the ONLY consumer of the USE_SESSION_SERVICE feature flag.
 * ConsultationContext must not import or check feature flags directly.
 *
 * The shim translates SessionService discriminated unions into the
 * reducer dispatches that ConsultationContext already understands.
 */

import { isFeatureEnabled } from '@/shared-kernel/feature-flags';
import type { SessionResult, SessionData, SessionInitializationResult, SessionCompletionResult, SessionSwitchResult, SessionVoid } from '@/application/services/SessionService';
import { SessionService } from '@/application/services/SessionService';
import { LegacySessionOperations } from '@/application/shims/LegacySessionOperations';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import type { WorkflowDispatch } from '@/application/shims/ConsultationWorkflowShim';

export type ShimDispatch = (action: any) => void;

export class SessionOperationsShim {
  constructor(
    private readonly service: SessionService,
    private readonly legacy: LegacySessionOperations,
    private readonly user: { id: string },
    private readonly dispatch: ShimDispatch,
  ) {}

  async initializeSession(appointmentId: number): Promise<SessionResult<SessionInitializationResult>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.initializeSession(appointmentId, this.user.id);
      this.dispatchServiceInitializeResult(result);
      return result;
    }
    return this.legacy.initializeSession(appointmentId, this.user, () => {}) as any as SessionResult<SessionInitializationResult>;
  }

  async startSession(appointmentId: number, doctorId: string, userId: string): Promise<SessionResult<SessionData>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.startSession(appointmentId, doctorId, userId);
      this.dispatchServiceStartResult(result);
      return result;
    }
    return this.legacy.startConsultation(appointmentId, doctorId, userId, this.user, () => {}) as any as SessionResult<SessionData>;
  }

  async resumeSession(consultationId: number): Promise<SessionResult<SessionData>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.resumeSession(consultationId);
      this.dispatchServiceResumeResult(result);
      return result;
    }
    return { success: false, error: { code: 'UNKNOWN' as any, message: 'Legacy resume not implemented', category: 'SYSTEM' as any, recoverable: false, retryable: false } };
  }

  async completeSession(consultationId: number): Promise<SessionResult<SessionCompletionResult>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.completeSession(consultationId, this.user.id);
      this.dispatchServiceCompleteResult(result);
      return result;
    }
    return this.legacy.completeConsultation(consultationId, this.dispatch) as any as SessionResult<SessionCompletionResult>;
  }

  async cancelCompletion(): Promise<SessionResult<SessionData>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.cancelCompletion();
      this.dispatchServiceCancelResult(result);
      return result;
    }
    return { success: false, error: { code: 'UNKNOWN' as any, message: 'Legacy cancel not implemented', category: 'SYSTEM' as any, recoverable: false, retryable: false } };
  }

  async pauseSession(): Promise<SessionVoid> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.pauseSession();
      this.dispatchServiceVoidResult(result);
      return result;
    }
    return { success: false, error: { code: 'UNKNOWN' as any, message: 'Legacy pause not implemented', category: 'SYSTEM' as any, recoverable: false, retryable: false } };
  }

  async resumePausedSession(): Promise<SessionVoid> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.resumePausedSession();
      this.dispatchServiceVoidResult(result);
      return result;
    }
    return { success: false, error: { code: 'UNKNOWN' as any, message: 'Legacy resume not implemented', category: 'SYSTEM' as any, recoverable: false, retryable: false } };
  }

  async switchSession(fromAppointmentId: number, toAppointmentId: number): Promise<SessionResult<SessionSwitchResult>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.switchSession(fromAppointmentId, toAppointmentId, this.user.id);
      this.dispatchServiceSwitchResult(result);
      return result;
    }
    return this.legacy.switchToPatient(toAppointmentId, this.dispatch) as any as SessionResult<SessionSwitchResult>;
  }

  async advanceQueue(doctorId: string): Promise<SessionResult<SessionInitializationResult | null>> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      const result = await this.service.advanceQueue(doctorId, this.user.id);
      this.dispatchServiceAdvanceQueueResult(result);
      return result;
    }
    return { success: false, error: { code: 'UNKNOWN' as any, message: 'Legacy advanceQueue not implemented', category: 'SYSTEM' as any, recoverable: false, retryable: false } };
  }

  async sendHeartbeat(consultationId: number): Promise<SessionVoid> {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      return this.service.sendHeartbeat(consultationId);
    }
    await this.legacy.sendHeartbeat(consultationId);
    return { success: true, data: undefined };
  }

  // ============================================================================
  // Service-path dispatchers
  // ============================================================================

  private dispatchServiceInitializeResult(result: SessionResult<SessionInitializationResult>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    const session = result.data.session;
    this.dispatch({
      type: 'SET_DATA',
      payload: {
        appointment: session.appointment,
        patient: session.patient,
        vitals: session.vitals,
        doctorId: session.doctorId,
      },
    });

    if (session.consultation) {
      this.dispatch({ type: 'SET_CONSULTATION', payload: session.consultation });
    }

    if (session.consultation?.notes?.structured) {
      this.dispatch({ type: 'SET_NOTES', payload: session.consultation.notes.structured });
    } else if (session.consultation?.notes?.fullText) {
      const { parseLegacyNotes } = require('@/shared-kernel/utils/note-serialization');
      this.dispatch({ type: 'SET_NOTES', payload: parseLegacyNotes(session.consultation.notes.fullText) });
    }

    if (session.consultation?.outcomeType) {
      this.dispatch({ type: 'SET_OUTCOME', payload: session.consultation.outcomeType });
    }

    if (session.consultation?.patientDecision) {
      this.dispatch({ type: 'SET_PATIENT_DECISION', payload: session.consultation.patientDecision });
    }

    this.dispatch({ type: 'SET_DIRTY', payload: session.isDirty });
    this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: session.workflowState });
    this.dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });

    if (session.workflowState === ConsultationWorkflowState.ACTIVE) {
      this.dispatch({ type: 'SHOW_START_DIALOG', payload: false });
    }
  }

  private dispatchServiceStartResult(result: SessionResult<SessionData>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    const session = result.data;
    this.dispatch({
      type: 'SET_DATA',
      payload: {
        appointment: session.appointment,
        patient: session.patient,
        vitals: session.vitals,
        doctorId: session.doctorId,
      },
    });

    if (session.consultation) {
      this.dispatch({ type: 'SET_CONSULTATION', payload: session.consultation });
    }

    this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: session.workflowState });
    this.dispatch({ type: 'SET_DIRTY', payload: session.isDirty });
    this.dispatch({ type: 'SHOW_START_DIALOG', payload: false });
  }

  private dispatchServiceResumeResult(result: SessionResult<SessionData>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    const session = result.data;
    this.dispatch({
      type: 'SET_DATA',
      payload: {
        appointment: session.appointment,
        patient: session.patient,
        vitals: session.vitals,
        doctorId: session.doctorId,
      },
    });

    if (session.consultation) {
      this.dispatch({ type: 'SET_CONSULTATION', payload: session.consultation });
    }

    this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: session.workflowState });
    this.dispatch({ type: 'SET_DIRTY', payload: session.isDirty });
    this.dispatch({ type: 'SHOW_START_DIALOG', payload: false });
  }

  private dispatchServiceCompleteResult(result: SessionResult<SessionCompletionResult>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    this.dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });
    this.dispatch({ type: 'RESET' });
  }

  private dispatchServiceCancelResult(result: SessionResult<SessionData>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: result.data.workflowState });
    this.dispatch({ type: 'SET_DIRTY', payload: result.data.isDirty });
  }

  private dispatchServiceVoidResult(result: SessionVoid): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
    }
  }

  private dispatchServiceSwitchResult(result: SessionResult<SessionSwitchResult>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    const next = result.data.nextSession;
    if (next) {
      const session = next.session;
      this.dispatch({
        type: 'SET_DATA',
        payload: {
          appointment: session.appointment,
          patient: session.patient,
          vitals: session.vitals,
          doctorId: session.doctorId,
        },
      });

      if (session.consultation) {
        this.dispatch({ type: 'SET_CONSULTATION', payload: session.consultation });
      }

      if (session.consultation?.notes?.structured) {
        this.dispatch({ type: 'SET_NOTES', payload: session.consultation.notes.structured });
      } else if (session.consultation?.notes?.fullText) {
        const { parseLegacyNotes } = require('@/shared-kernel/utils/note-serialization');
        this.dispatch({ type: 'SET_NOTES', payload: parseLegacyNotes(session.consultation.notes.fullText) });
      }

      if (session.consultation?.outcomeType) {
        this.dispatch({ type: 'SET_OUTCOME', payload: session.consultation.outcomeType });
      }

      if (session.consultation?.patientDecision) {
        this.dispatch({ type: 'SET_PATIENT_DECISION', payload: session.consultation.patientDecision });
      }

      this.dispatch({ type: 'SET_DIRTY', payload: session.isDirty });
      this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: session.workflowState });
      this.dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });

      if (session.workflowState === ConsultationWorkflowState.ACTIVE) {
        this.dispatch({ type: 'SHOW_START_DIALOG', payload: false });
      }
    }
  }

  private dispatchServiceAdvanceQueueResult(result: SessionResult<SessionInitializationResult | null>): void {
    this.dispatch({ type: 'SET_LOADING', payload: false });

    if (!result.success) {
      this.dispatch({ type: 'SET_ERROR', payload: result.error.message });
      return;
    }

    if (result.data === null) {
      this.dispatch({ type: 'RESET' });
      return;
    }

    const session = result.data.session;
    this.dispatch({
      type: 'SET_DATA',
      payload: {
        appointment: session.appointment,
        patient: session.patient,
        vitals: session.vitals,
        doctorId: session.doctorId,
      },
    });

    if (session.consultation) {
      this.dispatch({ type: 'SET_CONSULTATION', payload: session.consultation });
    }

    if (session.consultation?.notes?.structured) {
      this.dispatch({ type: 'SET_NOTES', payload: session.consultation.notes.structured });
    } else if (session.consultation?.notes?.fullText) {
      const { parseLegacyNotes } = require('@/shared-kernel/utils/note-serialization');
      this.dispatch({ type: 'SET_NOTES', payload: parseLegacyNotes(session.consultation.notes.fullText) });
    }

    this.dispatch({ type: 'SET_DIRTY', payload: session.isDirty });
    this.dispatch({ type: 'SET_WORKFLOW_STATE', payload: session.workflowState });
    this.dispatch({ type: 'SHOW_COMPLETE_DIALOG', payload: false });

    if (session.workflowState === ConsultationWorkflowState.ACTIVE) {
      this.dispatch({ type: 'SHOW_START_DIALOG', payload: false });
    }
  }
}
