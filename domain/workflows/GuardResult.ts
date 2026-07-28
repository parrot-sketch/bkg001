/**
 * Shared Kernel — Guard Types
 *
 * Guard execution types for workflow state machines.
 */

import type { ClinicalRisk } from './WorkflowState';

/**
 * Result of a guard check.
 */
export type GuardResult =
  | { readonly passed: true }
  | { readonly passed: false; readonly guardId: string; readonly reason: string; readonly clinicalRisk: ClinicalRisk };

/**
 * Guard function signature.
 * Pure function: reads context, returns result.
 */
export type GuardFunction = (context: unknown) => GuardResult;

/**
 * Guard registration for a specific transition.
 */
export interface GuardRegistration<S, A> {
  readonly from: S;
  readonly action: A;
  readonly guards: readonly GuardFunction[];
}
