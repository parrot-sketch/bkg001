/**
 * Application Layer — WorkflowCoordinatorFactory
 *
 * Performs all composition for WorkflowCoordinator.
 * Creates WorkflowEngine, SideEffectRegistry, SideEffectDispatcher, and WorkflowCoordinator.
 */

import type { WorkflowCoordinatorDependencies } from './WorkflowCoordinatorDependencies';
import type { GuardContext } from '@/domain/workflows/GuardContext';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import { SideEffectRegistry } from './SideEffectRegistry';
import { SideEffectDispatcher } from './SideEffectDispatcher';
import { WorkflowCoordinator } from './WorkflowCoordinator';
import { ConsultationWorkflowShim } from '@/application/shims/ConsultationWorkflowShim';
import { InProcessWorkflowEventBus } from '@/application/events/WorkflowEventBus';

export interface WorkflowCoordinatorFactoryOptions {
  readonly dependencies: Omit<WorkflowCoordinatorDependencies, 'workflowEngine'>;
  readonly consultationState?: ConsultationWorkflowState;
  readonly documentationState?: DocumentationWorkflowState;
  readonly context?: Partial<GuardContext>;
}

export function createWorkflowCoordinator(options: WorkflowCoordinatorFactoryOptions): WorkflowCoordinator {
  const { dependencies, consultationState = ConsultationWorkflowState.IDLE, documentationState = DocumentationWorkflowState.Document, context = {} } = options;

  const registry = new DefaultGuardRegistry();
  const engine = new WorkflowEngine(
    consultationState,
    documentationState,
    context as GuardContext,
    { registry, shortCircuit: false }
  );

  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });

  const coordinatorDependencies: WorkflowCoordinatorDependencies = {
    ...dependencies,
    workflowEngine: engine,
    eventBus,
  };

  return new WorkflowCoordinator(coordinatorDependencies);
}

export function createConsultationWorkflowShim(coordinator: WorkflowCoordinator): ConsultationWorkflowShim {
  return new ConsultationWorkflowShim(coordinator);
}
