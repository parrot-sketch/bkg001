/**
 * Application Layer — WorkflowCoordinator
 *
 * The sole orchestration entry point between the Presentation Layer and the Domain WorkflowEngine.
 *
 * Responsibilities:
 * - Execute commands against WorkflowEngine
 * - Execute emitted side effects
 * - Coordinate Application Services
 * - Aggregate failures
 * - Produce Application Results
 * - Guarantee execution ordering
 *
 * MUST NOT:
 * - know React
 * - know reducers
 * - know Context
 * - call setState
 * - call dispatch
 * - call localStorage
 * - call fetch
 * - call React Query
 */

import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import type { WorkflowCoordinatorDependencies } from './WorkflowCoordinatorDependencies';
import type { SideEffectDispatcher, SideEffectResult } from './SideEffectDispatcher';
import type { WorkflowCoordinatorResult, WorkflowSuccess, WorkflowPartialSuccess, WorkflowFailure } from './WorkflowCoordinatorResult';
import type { WorkflowEventBus } from '@/application/events';
import type { EventDispatchResult } from '@/application/events/WorkflowEventDispatcher';
import { createSideEffectRegistry } from './SideEffectRegistry';
import { SideEffectDispatcher as Dispatcher } from './SideEffectDispatcher';
import { WorkflowEventDispatcher } from '@/application/events/WorkflowEventDispatcher';
import type { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    if (Array.isArray(value)) {
      value.forEach(freeze);
    } else {
      Object.values(value).forEach(freeze);
    }
  }
  return value;
}

export class WorkflowCoordinator {
  private readonly dispatcher: SideEffectDispatcher;
  private readonly eventDispatcher: WorkflowEventDispatcher;

  constructor(
    private readonly dependencies: WorkflowCoordinatorDependencies
  ) {
    const registry = createSideEffectRegistry(dependencies);
    this.dispatcher = new Dispatcher(registry);
    this.eventDispatcher = new WorkflowEventDispatcher(dependencies.eventBus as any);
  }

  async execute(command: WorkflowCommand): Promise<WorkflowCoordinatorResult> {
    console.log('[TRACE] WorkflowCoordinator.execute ENTER', { commandType: command.type });
    const workflowResult = this.dependencies.workflowEngine.execute(command);
    console.log('[TRACE] WorkflowCoordinator.execute workflowResult', { 
        success: workflowResult.decision.success, 
        nextState: workflowResult.decision.nextConsultationState,
        errors: workflowResult.decision.errors.map(e => ({ name: (e as any).name || 'GuardFailure', message: (e as any).message }))
      });

    if (!workflowResult.decision.success) {
      const eventResults: EventDispatchResult[] = [];
      for (const event of workflowResult.decision.events) {
        const result = await this.eventDispatcher.dispatch(event);
        eventResults.push(result);
      }
      return freeze({
        status: 'failure',
        workflowResult,
        sideEffectResults: [],
        sideEffectFailures: [],
        eventResults,
      } as WorkflowFailure);
    }

    const sideEffectResult = await this.dispatcher.dispatch(workflowResult.decision.sideEffects);

    const eventResults: EventDispatchResult[] = [];
    for (const event of workflowResult.decision.events) {
      const result = await this.eventDispatcher.dispatch(event);
      eventResults.push(result);
    }

    if (sideEffectResult.success) {
      const successResults = workflowResult.decision.sideEffects.map((effect) => ({
        success: true as const,
        sideEffect: {
          type: effect.type,
          priority: effect.priority,
        },
      }));

      return freeze({
        status: 'success',
        workflowResult,
        sideEffectResults: successResults,
        eventResults,
      } as WorkflowSuccess);
    }

    const successResults = workflowResult.decision.sideEffects
      .filter((effect) => !sideEffectResult.failures.some((f) => f.sideEffect.type === effect.type && f.sideEffect.executionOrder === effect.executionOrder))
      .map((effect) => ({
        success: true as const,
        sideEffect: {
          type: effect.type,
          priority: effect.priority,
        },
      }));

    return freeze({
      status: 'partial_success',
      workflowResult,
      sideEffectResults: successResults,
      sideEffectFailures: sideEffectResult.failures,
      eventResults,
    } as WorkflowPartialSuccess);
  }

  resetConsultationState(state: ConsultationWorkflowState): void {
    this.dependencies.workflowEngine.resetConsultationState(state);
  }

  updateContext(patch: Partial<import('@/domain/workflows/GuardContext').GuardContext>): void {
    this.dependencies.workflowEngine.updateContext(patch as any);
  }
}