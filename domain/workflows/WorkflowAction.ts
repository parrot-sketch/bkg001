/**
 * Shared Kernel — Workflow Type Primitives
 *
 * Base action type for all workflow actions.
 */

/**
 * Base interface for workflow actions.
 */
export interface WorkflowAction {
  readonly name: string;
  readonly description: string;
}
