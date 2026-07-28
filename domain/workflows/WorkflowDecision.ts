/**
 * Workflow Decision
 *
 * The authoritative output of a workflow transition attempt.
 * Immutable and deterministic.
 */

import type { ConsultationWorkflowState } from './ConsultationWorkflowStateMachine';
import type { DocumentationWorkflowState } from './DocumentationWorkflowStateMachine';
import type { WorkflowErrorType } from './WorkflowError';
import type { WorkflowEvent } from './WorkflowEvent';
import type { WorkflowSideEffect } from './WorkflowSideEffect';

export interface WorkflowDecision {
  readonly success: boolean;
  readonly previousConsultationState: ConsultationWorkflowState;
  readonly nextConsultationState: ConsultationWorkflowState | null;
  readonly previousDocumentationState: DocumentationWorkflowState | null;
  readonly nextDocumentationState: DocumentationWorkflowState | null;
  readonly events: readonly WorkflowEvent[];
  readonly sideEffects: readonly WorkflowSideEffect[];
  readonly errors: readonly WorkflowErrorType[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export function createDecision(overrides: Partial<WorkflowDecision> = {}): WorkflowDecision {
  const {
    success = false,
    previousConsultationState,
    nextConsultationState = null,
    previousDocumentationState = null,
    nextDocumentationState = null,
    events = [],
    sideEffects = [],
    errors = [],
    metadata = {},
  } = overrides;

  if (!previousConsultationState) {
    throw new Error('previousConsultationState is required');
  }

  return {
    success,
    previousConsultationState,
    nextConsultationState,
    previousDocumentationState,
    nextDocumentationState,
    events,
    sideEffects,
    errors,
    metadata,
  };
}
