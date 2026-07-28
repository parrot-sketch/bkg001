/**
 * Application Layer — Consultation Workflow Shim
 *
 * Thin translation façade between ConsultationContext and the certified WorkflowEngine.
 * 
 * Responsibilities:
 * - Translate Presentation requests (fromState, toState) into WorkflowCommands
 * - Invoke WorkflowCoordinator
 * - Map results back to Presentation contracts
 * 
 * Contains NO business logic.
 * Contains NO legacy fallback path.
 */

import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import type { WorkflowCoordinatorResult } from '@/application/orchestrators/WorkflowCoordinatorResult';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import { WorkflowCoordinatorAdapter, TransitionRequest } from '@/application/shims/WorkflowCoordinatorAdapter';
import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';

export type TransitionOutcome = {
  success: boolean;
  nextState: ConsultationWorkflowState | null;
  partialFailure: boolean;
};

export type WorkflowDispatch = (action: { type: 'SET_WORKFLOW_STATE'; payload: ConsultationWorkflowState }) => void;

export class ConsultationWorkflowShim {
  private readonly adapter: WorkflowCoordinatorAdapter | null;

  constructor(coordinator: WorkflowCoordinator | null) {
    this.adapter = coordinator ? new WorkflowCoordinatorAdapter(coordinator) : null;
  }

  async transitionTo(
    fromState: ConsultationWorkflowState,
    toState: ConsultationWorkflowState,
    dispatch?: WorkflowDispatch
  ): Promise<TransitionOutcome> {
    const command = this.stateToCommand(fromState, toState);
    if (!command || !this.adapter) {
      return {
        success: false,
        nextState: null,
        partialFailure: false,
      };
    }

    const result = await this.adapter.transition({ command });
    const nextState = result.nextState ?? fromState;
    if (dispatch && result.success) {
      dispatch({ type: 'SET_WORKFLOW_STATE', payload: nextState });
    }
    return {
      success: result.success,
      nextState,
      partialFailure: result.partialFailure,
    };
  }

  canTransition(currentState: ConsultationWorkflowState, action: string): boolean {
    return false;
  }

  getNextState(currentState: ConsultationWorkflowState, action: string): ConsultationWorkflowState | null {
    return null;
  }

  isTerminalState(state: ConsultationWorkflowState): boolean {
    return state === ConsultationWorkflowState.COMPLETED;
  }

  private stateToAction(fromState: ConsultationWorkflowState, toState: ConsultationWorkflowState): string {
    if (fromState === ConsultationWorkflowState.IDLE && toState === ConsultationWorkflowState.LOADING) return 'LOAD_PATIENT';
    if (fromState === ConsultationWorkflowState.LOADING && toState === ConsultationWorkflowState.READY) return 'LOAD_SUCCESS';
    if (fromState === ConsultationWorkflowState.LOADING && toState === ConsultationWorkflowState.ERROR) return 'LOAD_ERROR';
    if (fromState === ConsultationWorkflowState.READY && toState === ConsultationWorkflowState.ACTIVE) return 'START_CONSULTATION';
    if (fromState === ConsultationWorkflowState.READY && toState === ConsultationWorkflowState.LOADING) return 'SWITCH_PATIENT';
    if (fromState === ConsultationWorkflowState.ACTIVE && toState === ConsultationWorkflowState.SAVING) return 'SAVE_DRAFT';
    if (fromState === ConsultationWorkflowState.ACTIVE && toState === ConsultationWorkflowState.COMPLETING) return 'OPEN_COMPLETE_DIALOG';
    if (fromState === ConsultationWorkflowState.ACTIVE && toState === ConsultationWorkflowState.LOADING) return 'SWITCH_PATIENT';
    if (fromState === ConsultationWorkflowState.ACTIVE && toState === ConsultationWorkflowState.PAUSED) return 'PAUSE';
    if (fromState === ConsultationWorkflowState.COMPLETING && toState === ConsultationWorkflowState.ACTIVE) return 'CANCEL_COMPLETE';
    if (fromState === ConsultationWorkflowState.COMPLETING && toState === ConsultationWorkflowState.TRANSITIONING) return 'CONFIRM_COMPLETE';
    if (fromState === ConsultationWorkflowState.TRANSITIONING && toState === ConsultationWorkflowState.LOADING) return 'LOAD_NEXT_PATIENT';
    if (fromState === ConsultationWorkflowState.TRANSITIONING && toState === ConsultationWorkflowState.COMPLETED) return 'COMPLETE_SESSION';
    if (fromState === ConsultationWorkflowState.SAVING && toState === ConsultationWorkflowState.ACTIVE) return 'SAVE_SUCCESS';
    if (fromState === ConsultationWorkflowState.SAVING && toState === ConsultationWorkflowState.CONFLICT) return 'SAVE_CONFLICT';
    if (fromState === ConsultationWorkflowState.SAVING && toState === ConsultationWorkflowState.ERROR) return 'SAVE_ERROR';
    if (fromState === ConsultationWorkflowState.CONFLICT && toState === ConsultationWorkflowState.ACTIVE) return 'RESOLVE_WITH_SERVER';
    if (fromState === ConsultationWorkflowState.CONFLICT && toState === ConsultationWorkflowState.SAVING) return 'RESOLVE_WITH_LOCAL';
    if (fromState === ConsultationWorkflowState.CONFLICT && toState === ConsultationWorkflowState.ACTIVE) return 'DISMISS_CONFLICT';
    if (fromState === ConsultationWorkflowState.ERROR && toState === ConsultationWorkflowState.LOADING) return 'RETRY';
    if (fromState === ConsultationWorkflowState.ERROR && toState === ConsultationWorkflowState.IDLE) return 'DISMISS_ERROR';
    if (fromState === ConsultationWorkflowState.ERROR && toState === ConsultationWorkflowState.ACTIVE) return 'COMPLETION_RETRY';
    if (fromState === ConsultationWorkflowState.PAUSED && toState === ConsultationWorkflowState.ACTIVE) return 'RESUME';
    if (fromState === ConsultationWorkflowState.PAUSED && toState === ConsultationWorkflowState.LOADING) return 'SWITCH_PATIENT';
    if (fromState === ConsultationWorkflowState.COMPLETED && toState === ConsultationWorkflowState.IDLE) return 'RESET';
    return 'UNKNOWN';
  }

  private stateToCommand(fromState: ConsultationWorkflowState, toState: ConsultationWorkflowState): WorkflowCommand | null {
    const action = this.stateToAction(fromState, toState);

    switch (action) {
      case 'LOAD_PATIENT':
        return { type: 'INITIALIZE_CONSULTATION', appointmentId: 0 };
      case 'START_CONSULTATION':
        return { type: 'START_CONSULTATION' };
      case 'OPEN_COMPLETE_DIALOG':
      case 'CANCEL_COMPLETE':
        return { type: 'CANCEL_CONSULTATION' };
      case 'CONFIRM_COMPLETE':
        return { type: 'COMPLETE_CONSULTATION' };
      case 'SWITCH_PATIENT':
        return { type: 'SWITCH_PATIENT', appointmentId: 0 };
      case 'PAUSE':
        return { type: 'PAUSE_CONSULTATION' };
      case 'RESUME':
        return { type: 'RESUME_CONSULTATION' };
      case 'LOAD_NEXT_PATIENT':
      case 'COMPLETE_SESSION':
        return { type: 'ADVANCE_QUEUE' };
      case 'RETRY':
      case 'DISMISS_ERROR':
      case 'COMPLETION_RETRY':
        return { type: 'RETRY_SAVE' } as WorkflowCommand;
      case 'RESOLVE_WITH_SERVER':
      case 'RESOLVE_WITH_LOCAL':
        return { type: 'RESOLVE_CONFLICT', strategy: 'LOCAL' };
      case 'DISMISS_CONFLICT':
        return { type: 'RESOLVE_CONFLICT', strategy: 'SERVER' };
      case 'RESET':
      case 'SAVE_SUCCESS':
      case 'SAVE_CONFLICT':
      case 'SAVE_ERROR':
      default:
        return null;
    }
  }
}
