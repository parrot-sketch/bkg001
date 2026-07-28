/**
 * Workflow Guard Engine
 *
 * Executes transition guards deterministically.
 *
 * Responsibilities:
 * - Execute transition guards
 * - Execute multiple guards deterministically
 * - Short-circuit when configured
 * - Aggregate violations
 * - Return typed GuardResult objects
 * - Never mutate state
 * - Never execute side effects
 * - Never perform persistence
 */

import type { GuardContext } from './GuardContext';
import type { GuardExecutionResult } from './GuardExecutionResult';
import type { GuardRegistry } from './GuardRegistry';
import type { GuardResult } from './GuardResult';
import type { GuardViolation } from './GuardViolation';

export interface WorkflowGuardEngineOptions {
  readonly shortCircuit: boolean;
}

export class WorkflowGuardEngine {
  constructor(
    private readonly registry: GuardRegistry,
    private readonly options: WorkflowGuardEngineOptions = { shortCircuit: false }
  ) {}

  /**
   * Validate all guards for a transition.
   * Returns complete results including all guard evaluations.
   */
  validate(from: string, action: string, ctx: GuardContext): GuardExecutionResult {
    const guards = this.registry.getGuards(from, action);
    const results: GuardResult[] = [];
    const violations: GuardViolation[] = [];

    for (const guard of guards) {
      const result = guard(ctx);
      results.push(result);

      if (!result.passed) {
        violations.push({
          guardId: result.guardId,
          reason: result.reason,
          clinicalRisk: result.clinicalRisk,
        });

        if (this.options.shortCircuit) {
          break;
        }
      }
    }

    return {
      passed: violations.length === 0,
      results,
      violations,
    };
  }

  /**
   * Shorthand: check if transition is allowed without returning full results.
   */
  canTransition(from: string, action: string, ctx: GuardContext): boolean {
    return this.validate(from, action, ctx).passed;
  }

  /**
   * Validate and return only failing guard IDs.
   */
  getFailingGuardIds(from: string, action: string, ctx: GuardContext): readonly string[] {
    const result = this.validate(from, action, ctx);
    return result.violations.map(v => v.guardId);
  }

  /**
   * Validate and return only the most clinically severe failure.
   */
  getHighestRiskViolation(from: string, action: string, ctx: GuardContext): GuardViolation | null {
    const result = this.validate(from, action, ctx);
    if (result.violations.length === 0) {
      return null;
    }

    const severityOrder = ['none', 'low', 'medium', 'high', 'critical'];
    let highest: GuardViolation = result.violations[0];

    for (const violation of result.violations) {
      if (severityOrder.indexOf(violation.clinicalRisk) > severityOrder.indexOf(highest.clinicalRisk)) {
        highest = violation;
      }
    }

    return highest;
  }
}
