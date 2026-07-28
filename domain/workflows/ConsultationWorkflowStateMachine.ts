/**
 * Domain — Consultation Workflow State Machine
 *
 * Defines the clear states and transitions for a consultation session.
 * This is the source of truth for what actions are valid at any point.
 *
 * States represent the DOCTOR'S workflow perspective:
 * - IDLE: No patient selected, viewing queue
 * - LOADING: Fetching patient/consultation data
 * - READY: Patient data loaded, can start consultation
 * - ACTIVE: Consultation in progress, taking notes
 * - PAUSED: Session temporarily suspended
 * - SAVING: Draft save in progress
 * - COMPLETING: Completion confirmation dialog open
 * - TRANSITIONING: Routing to next patient or hub
 * - COMPLETED: Terminal session end point
 * - CONFLICT: Version conflict detected during save
 * - ERROR: Something went wrong
 */

/**
 * Consultation workflow states.
 */
export enum ConsultationWorkflowState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SAVING = 'SAVING',
  COMPLETING = 'COMPLETING',
  TRANSITIONING = 'TRANSITIONING',
  COMPLETED = 'COMPLETED',
  CONFLICT = 'CONFLICT',
  ERROR = 'ERROR',
}

/**
 * Consultation workflow actions.
 */
export enum ConsultationWorkflowAction {
  LOAD_PATIENT = 'LOAD_PATIENT',
  LOAD_SUCCESS = 'LOAD_SUCCESS',
  LOAD_ERROR = 'LOAD_ERROR',
  START_CONSULTATION = 'START_CONSULTATION',
  SAVE_DRAFT = 'SAVE_DRAFT',
  OPEN_COMPLETE_DIALOG = 'OPEN_COMPLETE_DIALOG',
  CANCEL_COMPLETE = 'CANCEL_COMPLETE',
  CONFIRM_COMPLETE = 'CONFIRM_COMPLETE',
  SWITCH_PATIENT = 'SWITCH_PATIENT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  LOAD_NEXT_PATIENT = 'LOAD_NEXT_PATIENT',
  COMPLETE_SESSION = 'COMPLETE_SESSION',
  RETRY = 'RETRY',
  DISMISS_ERROR = 'DISMISS_ERROR',
  COMPLETION_RETRY = 'COMPLETION_RETRY',
  RESOLVE_WITH_SERVER = 'RESOLVE_WITH_SERVER',
  RESOLVE_WITH_LOCAL = 'RESOLVE_WITH_LOCAL',
  DISMISS_CONFLICT = 'DISMISS_CONFLICT',
  RESET = 'RESET',
  SAVE_SUCCESS = 'SAVE_SUCCESS',
  SAVE_CONFLICT = 'SAVE_CONFLICT',
  SAVE_ERROR = 'SAVE_ERROR',
}

/**
 * Consultation workflow context.
 */
export interface ConsultationWorkflowContext {
  readonly state: ConsultationWorkflowState;
  readonly appointmentId: number | null;
  readonly patientId: string | null;
  readonly consultationId: number | null;
  readonly error: string | null;
  readonly isDirty: boolean;
  readonly lastSavedAt: Date | null;
}

/**
 * Valid state transitions for ConsultationWorkflow.
 */
const VALID_TRANSITIONS: Record<ConsultationWorkflowState, ConsultationWorkflowAction[]> = {
  [ConsultationWorkflowState.IDLE]: [
    ConsultationWorkflowAction.LOAD_PATIENT,
    ConsultationWorkflowAction.SWITCH_PATIENT,
  ],
  [ConsultationWorkflowState.LOADING]: [
    ConsultationWorkflowAction.LOAD_SUCCESS,
    ConsultationWorkflowAction.LOAD_ERROR,
  ],
  [ConsultationWorkflowState.READY]: [
    ConsultationWorkflowAction.START_CONSULTATION,
    ConsultationWorkflowAction.SWITCH_PATIENT,
  ],
  [ConsultationWorkflowState.ACTIVE]: [
    ConsultationWorkflowAction.SAVE_DRAFT,
    ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG,
    ConsultationWorkflowAction.SWITCH_PATIENT,
    ConsultationWorkflowAction.PAUSE,
  ],
  [ConsultationWorkflowState.PAUSED]: [
    ConsultationWorkflowAction.RESUME,
    ConsultationWorkflowAction.SWITCH_PATIENT,
  ],
  [ConsultationWorkflowState.SAVING]: [
    ConsultationWorkflowAction.SAVE_SUCCESS,
    ConsultationWorkflowAction.SAVE_CONFLICT,
    ConsultationWorkflowAction.SAVE_ERROR,
  ],
  [ConsultationWorkflowState.COMPLETING]: [
    ConsultationWorkflowAction.CANCEL_COMPLETE,
    ConsultationWorkflowAction.CONFIRM_COMPLETE,
  ],
  [ConsultationWorkflowState.TRANSITIONING]: [
    ConsultationWorkflowAction.LOAD_NEXT_PATIENT,
    ConsultationWorkflowAction.COMPLETE_SESSION,
  ],
  [ConsultationWorkflowState.COMPLETED]: [
    ConsultationWorkflowAction.RESET,
  ],
  [ConsultationWorkflowState.CONFLICT]: [
    ConsultationWorkflowAction.RESOLVE_WITH_SERVER,
    ConsultationWorkflowAction.RESOLVE_WITH_LOCAL,
    ConsultationWorkflowAction.DISMISS_CONFLICT,
  ],
  [ConsultationWorkflowState.ERROR]: [
    ConsultationWorkflowAction.RETRY,
    ConsultationWorkflowAction.DISMISS_ERROR,
    ConsultationWorkflowAction.SWITCH_PATIENT,
    ConsultationWorkflowAction.COMPLETION_RETRY,
  ],
};

/**
 * Get the next state based on current state and action.
 */
export function getNextState(
  currentState: ConsultationWorkflowState,
  action: ConsultationWorkflowAction
): ConsultationWorkflowState | null {
  const validActions = VALID_TRANSITIONS[currentState];

  if (!validActions?.includes(action)) {
    return null;
  }

  switch (action) {
    case ConsultationWorkflowAction.LOAD_PATIENT:
      return ConsultationWorkflowState.LOADING;

    case ConsultationWorkflowAction.LOAD_SUCCESS:
      return ConsultationWorkflowState.READY;

    case ConsultationWorkflowAction.LOAD_ERROR:
      return ConsultationWorkflowState.ERROR;

    case ConsultationWorkflowAction.START_CONSULTATION:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.SAVE_DRAFT:
      return ConsultationWorkflowState.SAVING;

    case ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG:
      return ConsultationWorkflowState.COMPLETING;

    case ConsultationWorkflowAction.CANCEL_COMPLETE:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.CONFIRM_COMPLETE:
      return ConsultationWorkflowState.TRANSITIONING;

    case ConsultationWorkflowAction.SWITCH_PATIENT:
      return ConsultationWorkflowState.LOADING;

    case ConsultationWorkflowAction.PAUSE:
      return ConsultationWorkflowState.PAUSED;

    case ConsultationWorkflowAction.RESUME:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.LOAD_NEXT_PATIENT:
      return ConsultationWorkflowState.LOADING;

    case ConsultationWorkflowAction.COMPLETE_SESSION:
      return ConsultationWorkflowState.COMPLETED;

    case ConsultationWorkflowAction.RETRY:
      return ConsultationWorkflowState.LOADING;

    case ConsultationWorkflowAction.DISMISS_ERROR:
      return ConsultationWorkflowState.IDLE;

    case ConsultationWorkflowAction.COMPLETION_RETRY:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.RESOLVE_WITH_SERVER:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.RESOLVE_WITH_LOCAL:
      return ConsultationWorkflowState.SAVING;

    case ConsultationWorkflowAction.DISMISS_CONFLICT:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.RESET:
      return ConsultationWorkflowState.IDLE;

    case ConsultationWorkflowAction.SAVE_SUCCESS:
      return ConsultationWorkflowState.ACTIVE;

    case ConsultationWorkflowAction.SAVE_CONFLICT:
      return ConsultationWorkflowState.CONFLICT;

    case ConsultationWorkflowAction.SAVE_ERROR:
      return ConsultationWorkflowState.ERROR;

    default:
      return null;
  }
}

/**
 * Check if an action is valid for the current state.
 */
export function canPerformAction(
  currentState: ConsultationWorkflowState,
  action: ConsultationWorkflowAction
): boolean {
  return VALID_TRANSITIONS[currentState]?.includes(action) ?? false;
}

/**
 * Get all valid actions for a state.
 */
export function getValidActions(state: ConsultationWorkflowState): ConsultationWorkflowAction[] {
  return VALID_TRANSITIONS[state] || [];
}

/**
 * Create initial workflow context.
 */
export function createInitialContext(appointmentId?: number): ConsultationWorkflowContext {
  return {
    state: appointmentId ? ConsultationWorkflowState.LOADING : ConsultationWorkflowState.IDLE,
    appointmentId: appointmentId ?? null,
    patientId: null,
    consultationId: null,
    error: null,
    isDirty: false,
    lastSavedAt: null,
  };
}

/**
 * Check if a state is terminal.
 */
export function isTerminalState(state: ConsultationWorkflowState): boolean {
  return state === ConsultationWorkflowState.COMPLETED;
}
