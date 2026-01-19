/**
 * Domain Enum: ConsultationState
 * 
 * Represents the state of a consultation session.
 * This is a pure TypeScript enum with no framework dependencies.
 * 
 * State Transitions:
 * - NOT_STARTED → IN_PROGRESS (when consultation starts)
 * - IN_PROGRESS → COMPLETED (when consultation completes)
 * - COMPLETED is terminal (cannot transition further)
 */
export enum ConsultationState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Type guard to check if a string is a valid ConsultationState
 */
export function isConsultationState(value: string): value is ConsultationState {
  return Object.values(ConsultationState).includes(value as ConsultationState);
}

/**
 * Check if consultation can be started from current state
 */
export function canStartConsultationFromState(state: ConsultationState): boolean {
  return state === ConsultationState.NOT_STARTED;
}

/**
 * Check if consultation can be updated (draft saved) from current state
 */
export function canUpdateConsultation(state: ConsultationState): boolean {
  return state === ConsultationState.IN_PROGRESS;
}

/**
 * Check if consultation can be completed from current state
 */
export function canCompleteConsultation(state: ConsultationState): boolean {
  return state === ConsultationState.IN_PROGRESS;
}

/**
 * Check if consultation is in a terminal state
 */
export function isTerminalState(state: ConsultationState): boolean {
  return state === ConsultationState.COMPLETED;
}
