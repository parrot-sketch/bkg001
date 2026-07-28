/**
 * Application Layer — Side Effect Dispatcher
 *
 * Responsible only for translating Domain SideEffects into Application Service invocations.
 * Contains no business logic. It only routes work.
 */

import type { SideEffectRegistry } from './SideEffectRegistry';
import type { WorkflowSideEffect, BaseSideEffect } from '@/domain/workflows/WorkflowSideEffect';

export interface SideEffectFailure {
  readonly sideEffect: BaseSideEffect;
  readonly error: unknown;
}

export interface SideEffectResult {
  readonly success: boolean;
  readonly failures: readonly SideEffectFailure[];
}

export class SideEffectDispatcher {
  constructor(private readonly registry: SideEffectRegistry) {}

  async dispatch(sideEffects: readonly WorkflowSideEffect[]): Promise<SideEffectResult> {
    const sorted = [...sideEffects].sort((a, b) => {
      if (a.priority !== b.priority) {
        const order = { critical: 0, high: 1, normal: 2, low: 3 } as const;
        return order[a.priority] - order[b.priority];
      }
      return a.executionOrder - b.executionOrder;
    });

    const failures: SideEffectFailure[] = [];

    for (const effect of sorted) {
      const handler = this.registry.get(effect.type);
      if (!handler) {
        failures.push({
          sideEffect: effect as BaseSideEffect,
          error: new Error(`No handler registered for side effect type: ${effect.type}`),
        });
        continue;
      }

      try {
        const result = await handler.execute(effect);
        if (!result.success) {
          failures.push({
            sideEffect: effect as BaseSideEffect,
            error: result.error,
          });
        }
      } catch (error) {
        failures.push({
          sideEffect: effect as BaseSideEffect,
          error,
        });
      }
    }

    return {
      success: failures.length === 0,
      failures,
    };
  }
}
