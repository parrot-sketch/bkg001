/**
 * Workflow Command Handler
 *
 * Maps high-level commands to state machine actions.
 */

import type { TransitionContextBase } from './TransitionContext';
import type { WorkflowCommand } from './WorkflowCommand';
import type { WorkflowDecision } from './WorkflowDecision';
import type { ConsultationWorkflowAction } from './ConsultationWorkflowStateMachine';
import { DocumentationAction } from './DocumentationWorkflowStateMachine';
import type { ConsultationWorkflowState } from './ConsultationWorkflowStateMachine';
import type { DocumentationWorkflowState } from './DocumentationWorkflowStateMachine';
import type { WorkflowMetadata } from './WorkflowMetadata';

export interface CommandMapping {
  readonly consultationActions: readonly ConsultationWorkflowAction[];
  readonly documentationAction?: DocumentationAction;
  readonly requiresDocumentation: boolean;
}

export class WorkflowCommandHandler {
  mapToActions(
    command: WorkflowCommand,
    consultationState: ConsultationWorkflowState,
    documentationState: DocumentationWorkflowState,
    context: TransitionContextBase,
    metadata: WorkflowMetadata
  ): CommandMapping {
    switch (command.type) {
      case 'INITIALIZE_CONSULTATION':
        return {
          consultationActions: ['LOAD_PATIENT' as ConsultationWorkflowAction],
          documentationAction: undefined,
          requiresDocumentation: false,
        };

      case 'START_CONSULTATION':
        return {
          consultationActions: ['START_CONSULTATION' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.CREATE_DRAFT,
          requiresDocumentation: true,
        };

      case 'PAUSE_CONSULTATION':
        return {
          consultationActions: ['PAUSE' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.PAUSE,
          requiresDocumentation: true,
        };

      case 'RESUME_CONSULTATION':
        return {
          consultationActions: ['RESUME' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.RESUME,
          requiresDocumentation: true,
        };

      case 'BEGIN_DOCUMENTATION':
        return {
          consultationActions: [],
          documentationAction: DocumentationAction.CREATE_DRAFT,
          requiresDocumentation: true,
        };

      case 'SAVE_DOCUMENTATION':
        return {
          consultationActions: ['SAVE_DRAFT' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.SAVE,
          requiresDocumentation: true,
        };

      case 'RESTORE_DRAFT':
        return {
          consultationActions: [],
          documentationAction: DocumentationAction.RESTORE_DRAFT,
          requiresDocumentation: true,
        };

      case 'RETRY_SAVE':
        return {
          consultationActions: ['RETRY' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.RETRY_SAVE,
          requiresDocumentation: true,
        };

      case 'RESOLVE_CONFLICT':
        return {
          consultationActions: [
            command.strategy === 'SERVER'
              ? ('RESOLVE_WITH_SERVER' as ConsultationWorkflowAction)
              : ('RESOLVE_WITH_LOCAL' as ConsultationWorkflowAction),
          ],
          documentationAction:
            command.strategy === 'SERVER'
              ? ('RESOLVE_WITH_SERVER' as DocumentationAction)
              : ('RESOLVE_WITH_LOCAL' as DocumentationAction),
          requiresDocumentation: true,
        };

      case 'COMPLETE_CONSULTATION':
        return {
          consultationActions: ['CONFIRM_COMPLETE' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.COMPLETE,
          requiresDocumentation: true,
        };

      case 'CANCEL_CONSULTATION':
        return {
          consultationActions: ['CANCEL_COMPLETE' as ConsultationWorkflowAction],
          documentationAction: undefined,
          requiresDocumentation: false,
        };

      case 'SWITCH_PATIENT':
        return {
          consultationActions: ['SWITCH_PATIENT' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.SWITCH_PATIENT,
          requiresDocumentation: true,
        };

      case 'ADVANCE_QUEUE': {
        const hasNext = this.hasNextPatient(context);
        return {
          consultationActions: hasNext
            ? ['LOAD_NEXT_PATIENT' as ConsultationWorkflowAction]
            : ['COMPLETE_SESSION' as ConsultationWorkflowAction],
          documentationAction: DocumentationAction.COMPLETE,
          requiresDocumentation: true,
        };
      }

      default:
        return {
          consultationActions: [],
          documentationAction: undefined,
          requiresDocumentation: false,
        };
    }
  }

  private hasNextPatient(context: TransitionContextBase): boolean {
    const queue = (context as any).queue as { inConsultation?: readonly unknown[]; waiting?: readonly unknown[] } | undefined;
    if (!queue) return false;
    return (queue.inConsultation?.length ?? 0) > 0 || (queue.waiting?.length ?? 0) > 0;
  }
}
