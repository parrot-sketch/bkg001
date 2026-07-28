/**
 * Workflow Events
 *
 * Immutable domain events for workflow transitions.
 * Events are fire-and-forget notifications; consumers subscribe without modification.
 */

export interface WorkflowEventEnvelope<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly payload: T;
}

export interface ConsultationStartedPayload {
  readonly appointmentId: number;
  readonly patientId: string;
  readonly consultationId: number | null;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly patientName: string;
  readonly appointmentStatus: string;
}

export interface ConsultationPausedPayload {
  readonly appointmentId: number;
  readonly patientId: string;
  readonly pausedAt: number;
  readonly reason: 'user_initiated' | 'idle_timeout' | 'forced';
  readonly unsavedChanges: boolean;
}

export interface DocumentationSavedPayload {
  readonly appointmentId: number;
  readonly consultationId: number;
  readonly version: string;
  readonly savedAt: number;
  readonly saveType: 'auto' | 'manual';
  readonly fieldsChanged: readonly string[];
  readonly wordCount: number;
}

export interface DocumentationConflictDetectedPayload {
  readonly appointmentId: number;
  readonly consultationId: number;
  readonly serverVersion: string;
  readonly clientVersion: string;
  readonly serverUpdatedAt: number;
  readonly conflictFields: readonly string[];
}

export interface ConsultationCompletedPayload {
  readonly appointmentId: number;
  readonly patientId: string;
  readonly consultationId: number;
  readonly doctorId: string;
  readonly completedAt: number;
  readonly outcomeType: string;
  readonly patientDecision: string | null;
  readonly durationSeconds: number;
  readonly billingCreated: boolean;
  readonly surgicalCaseCreated: boolean;
}

export interface PatientSwitchedPayload {
  readonly fromAppointmentId: number | null;
  readonly toAppointmentId: number;
  readonly fromPatientId: string | null;
  readonly toPatientId: string;
  readonly doctorId: string;
  readonly reason: 'queue_advance' | 'manual_switch' | 'retry';
}

export interface QueueAdvancedPayload {
  readonly previousAppointmentId: number;
  readonly nextAppointmentId: number;
  readonly routingPriority: 'resume_in_consultation' | 'start_next_waiting';
  readonly queueLengthAfter: number;
}

export interface DraftRestoredPayload {
  readonly appointmentId: number;
  readonly consultationId: number;
  readonly draftTimestamp: number;
  readonly serverUpdatedAt: number;
  readonly fieldsRestored: readonly string[];
  readonly wasLegacyFormat: boolean;
}

export interface ConsultationFailedPayload {
  readonly appointmentId: number;
  readonly operation: 'load' | 'save' | 'complete' | 'switch';
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly recoverable: boolean;
  readonly timestamp: number;
}

export interface ConsultationRetriedPayload {
  readonly appointmentId: number;
  readonly previousErrorCode: string;
  readonly retryCount: number;
  readonly previousState: string;
  readonly nextState: string;
}

export interface DocumentationClearedPayload {
  readonly appointmentId: number;
  readonly reason: 'switch_patient' | 'completion';
  readonly notesWereDirty: boolean;
  readonly draftWasSaved: boolean;
}

export interface DocumentationFrozenPayload {
  readonly appointmentId: number;
  readonly autoSavePaused: boolean;
}

export type WorkflowEventType =
  | 'ConsultationStarted'
  | 'ConsultationPaused'
  | 'DocumentationSaved'
  | 'DocumentationConflictDetected'
  | 'ConsultationCompleted'
  | 'PatientSwitched'
  | 'QueueAdvanced'
  | 'DraftRestored'
  | 'ConsultationFailed'
  | 'ConsultationRetried'
  | 'DocumentationCleared'
  | 'DocumentationFrozen';

export type WorkflowEventPayload =
  | ConsultationStartedPayload
  | ConsultationPausedPayload
  | DocumentationSavedPayload
  | DocumentationConflictDetectedPayload
  | ConsultationCompletedPayload
  | PatientSwitchedPayload
  | QueueAdvancedPayload
  | DraftRestoredPayload
  | ConsultationFailedPayload
  | ConsultationRetriedPayload
  | DocumentationClearedPayload
  | DocumentationFrozenPayload;

export interface WorkflowEvent<T = unknown> extends WorkflowEventEnvelope<T> {}
