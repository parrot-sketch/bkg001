/**
 * Workflow Execution Result
 *
 * Wraps a WorkflowDecision with execution metadata.
 */

import type { WorkflowDecision } from './WorkflowDecision';

export interface WorkflowExecutionResult {
  readonly decision: WorkflowDecision;
  readonly executionTimeMs: number;
  readonly guardsEvaluated: number;
  readonly deterministic: boolean;
}

export function createExecutionResult(
  decision: WorkflowDecision,
  executionTimeMs: number,
  guardsEvaluated: number
): WorkflowExecutionResult {
  return {
    decision,
    executionTimeMs,
    guardsEvaluated,
    deterministic: true,
  };
}
