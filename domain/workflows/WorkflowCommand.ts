/**
 * Workflow Commands
 *
 * Typed commands that the WorkflowEngine accepts.
 * Each command contains only the data required to evaluate a transition.
 */

export interface InitializeConsultationCommand {
  readonly type: 'INITIALIZE_CONSULTATION';
  readonly appointmentId: number;
}

export interface StartConsultationCommand {
  readonly type: 'START_CONSULTATION';
}

export interface PauseConsultationCommand {
  readonly type: 'PAUSE_CONSULTATION';
}

export interface ResumeConsultationCommand {
  readonly type: 'RESUME_CONSULTATION';
}

export interface BeginDocumentationCommand {
  readonly type: 'BEGIN_DOCUMENTATION';
}

export interface SaveDocumentationCommand {
  readonly type: 'SAVE_DOCUMENTATION';
}

export interface RestoreDraftCommand {
  readonly type: 'RESTORE_DRAFT';
}

export interface RetrySaveCommand {
  readonly type: 'RETRY_SAVE';
}

export interface ResolveConflictCommand {
  readonly type: 'RESOLVE_CONFLICT';
  readonly strategy: 'SERVER' | 'LOCAL';
}

export interface CompleteConsultationCommand {
  readonly type: 'COMPLETE_CONSULTATION';
}

export interface CancelConsultationCommand {
  readonly type: 'CANCEL_CONSULTATION';
}

export interface SwitchPatientCommand {
  readonly type: 'SWITCH_PATIENT';
  readonly appointmentId: number;
}

export interface AdvanceQueueCommand {
  readonly type: 'ADVANCE_QUEUE';
}

export type WorkflowCommand =
  | InitializeConsultationCommand
  | StartConsultationCommand
  | PauseConsultationCommand
  | ResumeConsultationCommand
  | BeginDocumentationCommand
  | SaveDocumentationCommand
  | RestoreDraftCommand
  | RetrySaveCommand
  | ResolveConflictCommand
  | CompleteConsultationCommand
  | CancelConsultationCommand
  | SwitchPatientCommand
  | AdvanceQueueCommand;

export const WORKFLOW_COMMAND_TYPES = [
  'INITIALIZE_CONSULTATION',
  'START_CONSULTATION',
  'PAUSE_CONSULTATION',
  'RESUME_CONSULTATION',
  'BEGIN_DOCUMENTATION',
  'SAVE_DOCUMENTATION',
  'RESTORE_DRAFT',
  'RETRY_SAVE',
  'RESOLVE_CONFLICT',
  'COMPLETE_CONSULTATION',
  'CANCEL_CONSULTATION',
  'SWITCH_PATIENT',
  'ADVANCE_QUEUE',
] as const;

export function isWorkflowCommand(value: unknown): value is WorkflowCommand {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === 'string' && WORKFLOW_COMMAND_TYPES.includes(obj.type as any);
}
