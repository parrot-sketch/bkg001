/**
 * Domain — Documentation Workflow State Machine
 *
 * Manages the lifecycle of consultation notes (draft creation, auto-save,
 * manual save, conflict recovery, and completion locking).
 *
 * Runs in parallel with ConsultationWorkflowState.
 *
 * States: Document → Draft → Dirty → Saving → Saved → Conflict → Restoring → Failed
 */

/**
 * Documentation workflow states.
 */
export enum DocumentationWorkflowState {
  Document = 'Document',
  Draft = 'Draft',
  Dirty = 'Dirty',
  Saving = 'Saving',
  Saved = 'Saved',
  Conflict = 'Conflict',
  Restoring = 'Restoring',
  Failed = 'Failed',
}

/**
 * Documentation workflow actions.
 */
export enum DocumentationAction {
  CREATE_DRAFT = 'CREATE_DRAFT',
  EDIT_NOTES = 'EDIT_NOTES',
  SAVE = 'SAVE',
  SWITCH_PATIENT = 'SWITCH_PATIENT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  COMPLETE = 'COMPLETE',
  SAVE_SUCCESS = 'SAVE_SUCCESS',
  SAVE_CONFLICT = 'SAVE_CONFLICT',
  SAVE_ERROR = 'SAVE_ERROR',
  RESOLVE_WITH_SERVER = 'RESOLVE_WITH_SERVER',
  RESOLVE_WITH_LOCAL = 'RESOLVE_WITH_LOCAL',
  DISMISS_CONFLICT = 'DISMISS_CONFLICT',
  RESTORE_DRAFT = 'RESTORE_DRAFT',
  RESTORE_SUCCESS = 'RESTORE_SUCCESS',
  RESTORE_NOOP = 'RESTORE_NOOP',
  RETRY_SAVE = 'RETRY_SAVE',
}

/**
 * Documentation workflow context.
 */
export interface DocumentationContext {
  readonly appointmentId: number | null;
  readonly consultationId: number | null;
  readonly notes: {
    readonly rawText?: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType: string | null;
  readonly patientDecision: string | null;
  readonly version: string | null;
  readonly lastSavedAt: number | null;
  readonly dirtyFields: readonly string[];
  readonly hasLocalDraft: boolean;
  readonly localDraftTimestamp: number | null;
  readonly isDirty: boolean;
}

/**
 * Valid state transitions for DocumentationWorkflow.
 */
const VALID_TRANSITIONS: Record<DocumentationWorkflowState, DocumentationAction[]> = {
  [DocumentationWorkflowState.Document]: [
    DocumentationAction.CREATE_DRAFT,
    DocumentationAction.RESTORE_DRAFT,
  ],
  [DocumentationWorkflowState.Draft]: [
    DocumentationAction.EDIT_NOTES,
    DocumentationAction.SAVE,
    DocumentationAction.RESTORE_DRAFT,
  ],
  [DocumentationWorkflowState.Dirty]: [
    DocumentationAction.SAVE,
    DocumentationAction.SWITCH_PATIENT,
    DocumentationAction.COMPLETE,
    DocumentationAction.PAUSE,
  ],
  [DocumentationWorkflowState.Saving]: [
    DocumentationAction.SAVE_SUCCESS,
    DocumentationAction.SAVE_CONFLICT,
    DocumentationAction.SAVE_ERROR,
  ],
  [DocumentationWorkflowState.Saved]: [
    DocumentationAction.EDIT_NOTES,
  ],
  [DocumentationWorkflowState.Conflict]: [
    DocumentationAction.RESOLVE_WITH_SERVER,
    DocumentationAction.RESOLVE_WITH_LOCAL,
    DocumentationAction.DISMISS_CONFLICT,
  ],
  [DocumentationWorkflowState.Restoring]: [
    DocumentationAction.RESTORE_SUCCESS,
    DocumentationAction.RESTORE_NOOP,
  ],
  [DocumentationWorkflowState.Failed]: [
    DocumentationAction.RETRY_SAVE,
    DocumentationAction.EDIT_NOTES,
  ],
};

/**
 * Get the next state based on current state and action.
 */
export function getNextState(
  currentState: DocumentationWorkflowState,
  action: DocumentationAction
): DocumentationWorkflowState | null {
  const validActions = VALID_TRANSITIONS[currentState];

  if (!validActions?.includes(action)) {
    return null;
  }

  switch (action) {
    case DocumentationAction.CREATE_DRAFT:
      return DocumentationWorkflowState.Draft;
    case DocumentationAction.EDIT_NOTES:
      return DocumentationWorkflowState.Dirty;
    case DocumentationAction.SAVE:
      return DocumentationWorkflowState.Saving;
    case DocumentationAction.SWITCH_PATIENT:
      return DocumentationWorkflowState.Document;
    case DocumentationAction.PAUSE:
      return DocumentationWorkflowState.Document;
    case DocumentationAction.RESUME:
      return DocumentationWorkflowState.Dirty;
    case DocumentationAction.COMPLETE:
      return DocumentationWorkflowState.Document;
    case DocumentationAction.SAVE_SUCCESS:
      return DocumentationWorkflowState.Saved;
    case DocumentationAction.SAVE_CONFLICT:
      return DocumentationWorkflowState.Conflict;
    case DocumentationAction.SAVE_ERROR:
      return DocumentationWorkflowState.Failed;
    case DocumentationAction.RESOLVE_WITH_SERVER:
      return DocumentationWorkflowState.Saved;
    case DocumentationAction.RESOLVE_WITH_LOCAL:
      return DocumentationWorkflowState.Saving;
    case DocumentationAction.DISMISS_CONFLICT:
      return DocumentationWorkflowState.Dirty;
    case DocumentationAction.RESTORE_DRAFT:
      return DocumentationWorkflowState.Restoring;
    case DocumentationAction.RESTORE_SUCCESS:
      return DocumentationWorkflowState.Dirty;
    case DocumentationAction.RESTORE_NOOP:
      return DocumentationWorkflowState.Document;
    case DocumentationAction.RETRY_SAVE:
      return DocumentationWorkflowState.Saving;
    default:
      return null;
  }
}

/**
 * Check if an action is valid for the current state.
 */
export function canPerformAction(
  currentState: DocumentationWorkflowState,
  action: DocumentationAction
): boolean {
  return VALID_TRANSITIONS[currentState]?.includes(action) ?? false;
}

/**
 * Get all valid actions for a state.
 */
export function getValidActions(state: DocumentationWorkflowState): DocumentationAction[] {
  return VALID_TRANSITIONS[state] || [];
}

/**
 * Create initial documentation context.
 */
export function createInitialContext(): DocumentationContext {
  return {
    appointmentId: null,
    consultationId: null,
    notes: {},
    outcomeType: null,
    patientDecision: null,
    version: null,
    lastSavedAt: null,
    dirtyFields: [],
    hasLocalDraft: false,
    localDraftTimestamp: null,
    isDirty: false,
  };
}

/**
 * Check if a state is terminal.
 */
export function isTerminalState(state: DocumentationWorkflowState): boolean {
  return false;
}
