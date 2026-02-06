/**
 * Consultation Workflow State Machine
 * 
 * Defines the clear states and transitions for a consultation session.
 * This is the source of truth for what actions are valid at any point.
 * 
 * States represent the DOCTOR'S workflow perspective:
 * - IDLE: No patient selected, viewing queue
 * - LOADING: Fetching patient/consultation data
 * - READY: Patient data loaded, can start consultation
 * - ACTIVE: Consultation in progress, taking notes
 * - COMPLETING: Completing consultation (dialog open)
 * - TRANSITIONING: Switching to next patient or surgery workflow
 * - ERROR: Something went wrong
 */

export enum ConsultationWorkflowState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  COMPLETING = 'COMPLETING',
  TRANSITIONING = 'TRANSITIONING',
  ERROR = 'ERROR',
}

export enum ConsultationWorkflowAction {
  // Data loading
  LOAD_PATIENT = 'LOAD_PATIENT',
  LOAD_SUCCESS = 'LOAD_SUCCESS',
  LOAD_ERROR = 'LOAD_ERROR',
  
  // Consultation lifecycle
  START_CONSULTATION = 'START_CONSULTATION',
  SAVE_DRAFT = 'SAVE_DRAFT',
  OPEN_COMPLETE_DIALOG = 'OPEN_COMPLETE_DIALOG',
  CANCEL_COMPLETE = 'CANCEL_COMPLETE',
  CONFIRM_COMPLETE = 'CONFIRM_COMPLETE',
  
  // Navigation
  SWITCH_PATIENT = 'SWITCH_PATIENT',
  GO_TO_SURGERY = 'GO_TO_SURGERY',
  
  // Error handling
  RETRY = 'RETRY',
  DISMISS_ERROR = 'DISMISS_ERROR',
}

export interface ConsultationWorkflowContext {
  state: ConsultationWorkflowState;
  appointmentId: number | null;
  patientId: string | null;
  consultationId: number | null;
  error: string | null;
  isDirty: boolean; // Has unsaved changes
  lastSavedAt: Date | null;
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<ConsultationWorkflowState, ConsultationWorkflowAction[]> = {
  [ConsultationWorkflowState.IDLE]: [
    ConsultationWorkflowAction.LOAD_PATIENT,
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
  ],
  [ConsultationWorkflowState.COMPLETING]: [
    ConsultationWorkflowAction.CANCEL_COMPLETE,
    ConsultationWorkflowAction.CONFIRM_COMPLETE,
  ],
  [ConsultationWorkflowState.TRANSITIONING]: [
    ConsultationWorkflowAction.LOAD_PATIENT,
    ConsultationWorkflowAction.GO_TO_SURGERY,
  ],
  [ConsultationWorkflowState.ERROR]: [
    ConsultationWorkflowAction.RETRY,
    ConsultationWorkflowAction.DISMISS_ERROR,
    ConsultationWorkflowAction.SWITCH_PATIENT,
  ],
};

/**
 * Get the next state based on current state and action
 */
export function getNextState(
  currentState: ConsultationWorkflowState,
  action: ConsultationWorkflowAction
): ConsultationWorkflowState | null {
  const validActions = VALID_TRANSITIONS[currentState];
  
  if (!validActions.includes(action)) {
    console.warn(`Invalid transition: ${currentState} + ${action}`);
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
      return ConsultationWorkflowState.ACTIVE; // Stay in ACTIVE
      
    case ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG:
      return ConsultationWorkflowState.COMPLETING;
      
    case ConsultationWorkflowAction.CANCEL_COMPLETE:
      return ConsultationWorkflowState.ACTIVE;
      
    case ConsultationWorkflowAction.CONFIRM_COMPLETE:
      return ConsultationWorkflowState.TRANSITIONING;
      
    case ConsultationWorkflowAction.SWITCH_PATIENT:
      return ConsultationWorkflowState.LOADING;
      
    case ConsultationWorkflowAction.GO_TO_SURGERY:
      return ConsultationWorkflowState.TRANSITIONING;
      
    case ConsultationWorkflowAction.RETRY:
      return ConsultationWorkflowState.LOADING;
      
    case ConsultationWorkflowAction.DISMISS_ERROR:
      return ConsultationWorkflowState.IDLE;
      
    default:
      return null;
  }
}

/**
 * Check if an action is valid for the current state
 */
export function canPerformAction(
  currentState: ConsultationWorkflowState,
  action: ConsultationWorkflowAction
): boolean {
  return VALID_TRANSITIONS[currentState]?.includes(action) ?? false;
}

/**
 * Get all valid actions for a state
 */
export function getValidActions(state: ConsultationWorkflowState): ConsultationWorkflowAction[] {
  return VALID_TRANSITIONS[state] || [];
}

/**
 * Create initial workflow context
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
