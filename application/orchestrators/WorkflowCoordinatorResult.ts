/**
 * Application Layer — WorkflowCoordinator Result
 *
 * Discriminated union describing the outcome of a workflow coordination attempt.
 */

import type { WorkflowExecutionResult } from '@/domain/workflows/WorkflowExecutionResult';
import type { SideEffectFailure } from './SideEffectDispatcher';
import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';

/**
 * Workflow execution succeeded and all side effects succeeded.
 */
export interface WorkflowSuccess {
  readonly status: 'success';
  readonly workflowResult: WorkflowExecutionResult;
  readonly sideEffectResults: readonly Success[];
  readonly eventResults: readonly EventDispatchResult[];
}

/**
 * Workflow execution succeeded but one or more side effects failed.
 */
export interface WorkflowPartialSuccess {
  readonly status: 'partial_success';
  readonly workflowResult: WorkflowExecutionResult;
  readonly sideEffectResults: readonly Success[];
  readonly sideEffectFailures: readonly SideEffectFailure[];
  readonly eventResults: readonly EventDispatchResult[];
}

/**
 * Workflow execution failed (invalid transition, guard failure, etc.).
 * No side effects were attempted.
 */
export interface WorkflowFailure {
  readonly status: 'failure';
  readonly workflowResult: WorkflowExecutionResult;
  readonly sideEffectResults: readonly [];
  readonly sideEffectFailures: readonly SideEffectFailure[];
  readonly eventResults: readonly EventDispatchResult[];
}

/**
 * Successful side effect result.
 */
export interface Success {
  readonly success: true;
  readonly sideEffect: {
    readonly type: string;
    readonly priority: string;
  };
}

/**
 * Event dispatch result.
 */
export interface EventDispatchResult {
  readonly event: WorkflowEvent;
  readonly subscriberCount: number;
  readonly failures: readonly { readonly subscriber: unknown; readonly error: unknown }[];
}

/**
 * Discriminated union for all coordination outcomes.
 */
export type WorkflowCoordinatorResult = WorkflowSuccess | WorkflowPartialSuccess | WorkflowFailure;

export function isWorkflowSuccess(result: WorkflowCoordinatorResult): result is WorkflowSuccess {
  return result.status === 'success';
}

export function isWorkflowPartialSuccess(result: WorkflowCoordinatorResult): result is WorkflowPartialSuccess {
  return result.status === 'partial_success';
}

export function isWorkflowFailure(result: WorkflowCoordinatorResult): result is WorkflowFailure {
  return result.status === 'failure';
}
