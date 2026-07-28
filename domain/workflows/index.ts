/**
 * Domain — Workflows Barrel Export
 *
 * Public API for all workflow state machines.
 */

// Shared types (exported once to avoid conflicts)
export {
  type ClinicalRisk,
  type WorkflowStateBase,
  type WorkflowActionBase,
  type WorkflowContextBase,
} from './WorkflowState';

export {
  type WorkflowAction,
} from './WorkflowAction';

export {
  type Transition,
} from './Transition';

export {
  type GuardResult,
  type GuardFunction,
  type GuardRegistration,
} from './GuardResult';

export {
  type TransitionContextBase,
  type ConsultationTransitionContext,
  type DocumentationTransitionContext,
} from './TransitionContext';

export {
  type WorkflowError,
  type SideEffect,
  type TransitionResult,
} from './TransitionResult';

// Consultation Workflow
export * as ConsultationWorkflow from './ConsultationWorkflowStateMachine';

// Documentation Workflow
export * as DocumentationWorkflow from './DocumentationWorkflowStateMachine';

// Guard Engine
export * from './GuardContext';
export * from './GuardViolation';
export * from './GuardExecutionResult';
export * from './GuardRegistry';
export * from './DefaultGuardRegistry';
export * from './WorkflowGuardEngine';

// Guards (via barrel)
export * as Guards from './guards';

// Engine
export * from './WorkflowError';
export * from './WorkflowEvent';
export * from './WorkflowSideEffect';
export * from './WorkflowMetadata';
export * from './WorkflowCommand';
export * from './WorkflowCommandHandler';
export * from './WorkflowDecision';
export * from './WorkflowExecutionResult';
export * from './WorkflowEngine';
