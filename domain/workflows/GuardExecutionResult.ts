/**
 * Shared Kernel — Guard Execution Result
 *
 * Aggregated result of executing one or more guards for a transition.
 */

import type { GuardViolation } from './GuardViolation';
import type { GuardResult } from './GuardResult';

/**
 * Result of executing all guards for a transition.
 */
export interface GuardExecutionResult {
  readonly passed: boolean;
  readonly results: readonly GuardResult[];
  readonly violations: readonly GuardViolation[];
}
