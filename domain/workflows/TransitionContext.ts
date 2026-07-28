/**
 * Shared Kernel — Transition Context
 *
 * Immutable context passed to guards and transition handlers.
 */

import type { StructuredNotes } from '@/shared-kernel/types/notes';
import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';
import type { ConsultationWorkflowState } from './ConsultationWorkflowStateMachine';
import type { DocumentationWorkflowState } from './DocumentationWorkflowStateMachine';

/**
 * Base transition context.
 */
export interface TransitionContextBase {
  readonly appointmentId: number | null;
  readonly patientId: string | null;
  readonly consultationId: number | null;
  readonly doctorId: string | null;
}

/**
 * Consultation-specific transition context.
 */
export interface ConsultationTransitionContext extends TransitionContextBase {
  readonly appointment: {
    readonly id: number;
    readonly patientId: string;
    readonly doctorId: string;
    readonly status: string;
    readonly slotStartTime: string;
    readonly slotDurationMinutes: number;
  } | null;
  readonly consultation: {
    readonly id: number;
    readonly appointmentId: number;
    readonly state: string;
    readonly version: string;
    readonly updatedAt: string;
  } | null;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
  readonly isDirty: boolean;
  readonly lastSavedAt: number | null;
  readonly version: string | null;
  readonly queue: {
    readonly inConsultation: readonly { readonly id: number; readonly patientId: string }[];
    readonly waiting: readonly { readonly id: number; readonly patientId: string }[];
  } | null;
  readonly user: {
    readonly id: string;
    readonly role: string;
    readonly name: string;
  };
  readonly retryCount: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly consultationWorkflowState: ConsultationWorkflowState;
  readonly documentationWorkflowState: DocumentationWorkflowState;
}

/**
 * Documentation-specific transition context.
 */
export interface DocumentationTransitionContext extends TransitionContextBase {
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
  readonly version: string | null;
  readonly lastSavedAt: number | null;
  readonly dirtyFields: readonly string[];
  readonly hasLocalDraft: boolean;
  readonly localDraftTimestamp: number | null;
  readonly documentationWorkflowState: DocumentationWorkflowState;
}
