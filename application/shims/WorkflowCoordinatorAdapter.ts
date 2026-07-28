/**
 * Application Layer — WorkflowCoordinator Adapter
 *
 * Adapts the WorkflowCoordinator to the legacy workflow operations interface.
 * Translates WorkflowCoordinatorResult into simple success/failure outcomes.
 */

import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';
import { isWorkflowSuccess, isWorkflowPartialSuccess, isWorkflowFailure } from '@/application/orchestrators/WorkflowCoordinatorResult';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import type { WorkflowCoordinatorResult } from '@/application/orchestrators/WorkflowCoordinatorResult';
import type { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

export interface TransitionRequest {
  readonly command: WorkflowCommand;
}

export interface TransitionResponse {
  readonly success: boolean;
  readonly nextState: ConsultationWorkflowState | null;
  readonly partialFailure: boolean;
}

export class WorkflowCoordinatorAdapter {
  constructor(private readonly coordinator: WorkflowCoordinator) {}

  async transition(request: TransitionRequest): Promise<TransitionResponse> {
    const result = await this.coordinator.execute(request.command);

    if (isWorkflowSuccess(result)) {
      return {
        success: true,
        nextState: result.workflowResult.decision.nextConsultationState ?? result.workflowResult.decision.previousConsultationState,
        partialFailure: false,
      };
    }

    if (isWorkflowPartialSuccess(result)) {
      return {
        success: true,
        nextState: result.workflowResult.decision.nextConsultationState ?? result.workflowResult.decision.previousConsultationState,
        partialFailure: true,
      };
    }

    return {
      success: false,
      nextState: null,
      partialFailure: false,
    };
  }
}
