/**
 * Shared Kernel — Transition Types
 *
 * Types for workflow state transitions.
 */

import type { ClinicalRisk } from './WorkflowState';

/**
 * Result of a guard check.
 */
export type GuardResult =
  | { readonly passed: true }
  | { readonly passed: false; readonly reason: string; readonly clinicalRisk: ClinicalRisk };

/**
 * Workflow error types.
 */
export type WorkflowError =
  | { readonly code: 'INVALID_ACTION'; readonly message: string; readonly action: string; readonly state: string }
  | { readonly code: 'GUARD_FAILED'; readonly message: string; readonly guardId: string; readonly reason: string; readonly clinicalRisk: ClinicalRisk }
  | { readonly code: 'TRANSITION_FAILED'; readonly message: string; readonly from: string; readonly to: string; readonly cause?: unknown }
  | { readonly code: 'ENGINE_CORRUPTED'; readonly message: string; readonly detail: string }
  | { readonly code: 'CONTEXT_MISSING'; readonly message: string; readonly field: string };

/**
 * Side effect types that can be emitted during transitions.
 */
export type SideEffect =
  | { readonly type: 'toast'; readonly message: string; readonly severity: 'info' | 'success' | 'error' | 'warning' }
  | { readonly type: 'invalidateCache'; readonly queryKey: readonly string[] }
  | { readonly type: 'clearStorage'; readonly key: string }
  | { readonly type: 'startHeartbeat'; readonly consultationId: number }
  | { readonly type: 'stopHeartbeat' }
  | { readonly type: 'startAutoSave'; readonly debounceMs: number }
  | { readonly type: 'stopAutoSave' }
  | { readonly type: 'navigation'; readonly path: string }
  | { readonly type: 'event'; readonly eventType: string; readonly payload: unknown };

/**
 * Result of a transition attempt.
 */
export interface TransitionResult<TState = string> {
  readonly success: boolean;
  readonly previousState: TState;
  readonly nextState: TState | null;
  readonly guardFailures: readonly GuardResult[];
  readonly sideEffects: readonly SideEffect[];
  readonly error: WorkflowError | null;
}
