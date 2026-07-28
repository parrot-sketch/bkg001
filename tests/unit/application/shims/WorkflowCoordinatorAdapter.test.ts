import { describe, it, expect, vi } from 'vitest';
import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';
import { WorkflowCoordinatorAdapter } from '@/application/shims/WorkflowCoordinatorAdapter';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';

describe('WorkflowCoordinatorAdapter', () => {
  it('returns success when coordinator succeeds', async () => {
    const mockCoordinator = {
      execute: vi.fn().mockResolvedValue({
        status: 'success',
        workflowResult: {
          decision: {
            success: true,
            previousConsultationState: ConsultationWorkflowState.READY,
            nextConsultationState: ConsultationWorkflowState.ACTIVE,
          },
        },
        sideEffectResults: [],
        sideEffectFailures: [],
      }),
    } as unknown as WorkflowCoordinator;

    const adapter = new WorkflowCoordinatorAdapter(mockCoordinator);
    const result = await adapter.transition({
      command: { type: 'START_CONSULTATION' } as WorkflowCommand,
    });

    expect(result.success).toBe(true);
    expect(result.nextState).toBe(ConsultationWorkflowState.ACTIVE);
    expect(result.partialFailure).toBe(false);
  });

  it('returns partialFailure when coordinator returns partial_success', async () => {
    const mockCoordinator = {
      execute: vi.fn().mockResolvedValue({
        status: 'partial_success',
        workflowResult: {
          decision: {
            success: true,
            previousConsultationState: ConsultationWorkflowState.READY,
            nextConsultationState: ConsultationWorkflowState.ACTIVE,
          },
        },
        sideEffectResults: [],
        sideEffectFailures: [],
      }),
    } as unknown as WorkflowCoordinator;

    const adapter = new WorkflowCoordinatorAdapter(mockCoordinator);
    const result = await adapter.transition({
      command: { type: 'START_CONSULTATION' } as WorkflowCommand,
    });

    expect(result.success).toBe(true);
    expect(result.nextState).toBe(ConsultationWorkflowState.ACTIVE);
    expect(result.partialFailure).toBe(true);
  });

  it('returns failure when coordinator fails', async () => {
    const mockCoordinator = {
      execute: vi.fn().mockResolvedValue({
        status: 'failure',
        workflowResult: {
          decision: {
            success: false,
            previousConsultationState: ConsultationWorkflowState.IDLE,
            nextConsultationState: null,
            errors: [],
          },
        },
        sideEffectResults: [],
        sideEffectFailures: [],
      }),
    } as unknown as WorkflowCoordinator;

    const adapter = new WorkflowCoordinatorAdapter(mockCoordinator);
    const result = await adapter.transition({
      command: { type: 'START_CONSULTATION' } as WorkflowCommand,
    });

    expect(result.success).toBe(false);
    expect(result.nextState).toBeNull();
    expect(result.partialFailure).toBe(false);
  });

  it('falls back to previous state when nextState is null', async () => {
    const mockCoordinator = {
      execute: vi.fn().mockResolvedValue({
        status: 'success',
        workflowResult: {
          decision: {
            success: true,
            previousConsultationState: ConsultationWorkflowState.READY,
            nextConsultationState: null,
          },
        },
        sideEffectResults: [],
        sideEffectFailures: [],
      }),
    } as unknown as WorkflowCoordinator;

    const adapter = new WorkflowCoordinatorAdapter(mockCoordinator);
    const result = await adapter.transition({
      command: { type: 'START_CONSULTATION' } as WorkflowCommand,
    });

    expect(result.success).toBe(true);
    expect(result.nextState).toBe(ConsultationWorkflowState.READY);
  });
});
