/**
 * Shared Kernel — Guard Violation
 *
 * Represents a single failed guard check during transition validation.
 */

import type { ClinicalRisk } from './WorkflowState';

/**
 * Detailed violation information for a failed guard.
 */
export interface GuardViolation {
  readonly guardId: string;
  readonly reason: string;
  readonly clinicalRisk: ClinicalRisk;
}
