import { describe, it, expect, vi } from 'vitest';
import { ConsultationWorkflowShim } from '@/application/shims/ConsultationWorkflowShim';
import { WorkflowCoordinatorAdapter } from '@/application/shims/WorkflowCoordinatorAdapter';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';

describe('ConsultationWorkflowShim', () => {
  describe('thin façade (no legacy fallback)', () => {
    it('returns failure when coordinator is null', async () => {
      const shim = new ConsultationWorkflowShim(null);
      const dispatch = vi.fn();

      const result = await shim.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.LOADING,
        dispatch
      );

      expect(result.success).toBe(false);
      expect(result.nextState).toBeNull();
      expect(result.partialFailure).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('returns failure for invalid transition when coordinator is null', async () => {
      const shim = new ConsultationWorkflowShim(null);
      const dispatch = vi.fn();

      const result = await shim.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.ACTIVE,
        dispatch
      );

      expect(result.success).toBe(false);
      expect(result.nextState).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('coordinator path', () => {
    it('delegates to adapter when coordinator is provided', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.ACTIVE,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;
      const dispatch = vi.fn();

      const result = await shim.transitionTo(
        ConsultationWorkflowState.READY,
        ConsultationWorkflowState.ACTIVE,
        dispatch
      );

      expect(result.success).toBe(true);
      expect(result.nextState).toBe(ConsultationWorkflowState.ACTIVE);
      expect(mockAdapter.transition).toHaveBeenCalled();
    });

    it('delegates valid command to adapter', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.ACTIVE,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;
      const dispatch = vi.fn();

      const result = await shim.transitionTo(
        ConsultationWorkflowState.READY,
        ConsultationWorkflowState.ACTIVE,
        dispatch
      );

      expect(result.success).toBe(true);
      expect(dispatch).toHaveBeenCalled();
    });
  });

  describe('reducer compatibility', () => {
    it('dispatches correct action for LOADING transition', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.LOADING,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;
      const dispatch = vi.fn();

      await shim.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.LOADING,
        dispatch
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_WORKFLOW_STATE',
        payload: ConsultationWorkflowState.LOADING,
      });
    });

    it('dispatches correct action for ACTIVE transition', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.ACTIVE,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;
      const dispatch = vi.fn();

      await shim.transitionTo(
        ConsultationWorkflowState.READY,
        ConsultationWorkflowState.ACTIVE,
        dispatch
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_WORKFLOW_STATE',
        payload: ConsultationWorkflowState.ACTIVE,
      });
    });
  });

  describe('deterministic execution', () => {
    it('produces identical results for identical inputs', async () => {
      const shim1 = new ConsultationWorkflowShim(null);
      const shim2 = new ConsultationWorkflowShim(null);
      const dispatch1 = vi.fn();
      const dispatch2 = vi.fn();

      const result1 = await shim1.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.LOADING,
        dispatch1
      );
      const result2 = await shim2.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.LOADING,
        dispatch2
      );

      expect(result1.success).toBe(result2.success);
      expect(result1.nextState).toBe(result2.nextState);
      expect(dispatch1).toHaveBeenCalledTimes(dispatch2.mock.calls.length);
    });
  });

  describe('no duplicate transitions', () => {
    it('does not dispatch if command translation returns null', async () => {
      const shim = new ConsultationWorkflowShim(null);
      const dispatch = vi.fn();

      await shim.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.ACTIVE,
        dispatch
      );

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('command translation', () => {
    it('maps IDLE->LOADING to INITIALIZE_CONSULTATION', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.LOADING,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;

      await shim.transitionTo(
        ConsultationWorkflowState.IDLE,
        ConsultationWorkflowState.LOADING
      );

      expect(mockAdapter.transition).toHaveBeenCalledWith({
        command: { type: 'INITIALIZE_CONSULTATION', appointmentId: 0 },
      });
    });

    it('maps READY->ACTIVE to START_CONSULTATION', async () => {
      const mockAdapter = {
        transition: vi.fn().mockResolvedValue({
          success: true,
          nextState: ConsultationWorkflowState.ACTIVE,
          partialFailure: false,
        }),
      };
      const shim = new ConsultationWorkflowShim(null as any);
      (shim as any).adapter = mockAdapter;

      await shim.transitionTo(
        ConsultationWorkflowState.READY,
        ConsultationWorkflowState.ACTIVE
      );

      expect(mockAdapter.transition).toHaveBeenCalledWith({
        command: { type: 'START_CONSULTATION' },
      });
    });
  });

  describe('construction', () => {
    it('creates shim without coordinator', () => {
      const shim = new ConsultationWorkflowShim(null);
      expect(shim).toBeInstanceOf(ConsultationWorkflowShim);
    });

    it('creates shim with coordinator', () => {
      const mockCoordinator = { execute: vi.fn() } as unknown as WorkflowCoordinator;
      const shim = new ConsultationWorkflowShim(mockCoordinator);
      expect(shim).toBeInstanceOf(ConsultationWorkflowShim);
    });
  });

  describe('legacy method stubs', () => {
    it('canTransition returns false', () => {
      const shim = new ConsultationWorkflowShim(null);
      expect(shim.canTransition(ConsultationWorkflowState.IDLE, 'LOAD_PATIENT')).toBe(false);
    });

    it('getNextState returns null', () => {
      const shim = new ConsultationWorkflowShim(null);
      expect(shim.getNextState(ConsultationWorkflowState.IDLE, 'LOAD_PATIENT')).toBeNull();
    });

    it('isTerminalState returns true only for COMPLETED', () => {
      const shim = new ConsultationWorkflowShim(null);
      expect(shim.isTerminalState(ConsultationWorkflowState.COMPLETED)).toBe(true);
      expect(shim.isTerminalState(ConsultationWorkflowState.ACTIVE)).toBe(false);
    });
  });
});
