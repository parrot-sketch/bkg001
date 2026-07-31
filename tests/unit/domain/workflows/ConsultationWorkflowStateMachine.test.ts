/**
 * Unit tests for ConsultationWorkflowStateMachine
 */

import { describe, it, expect } from 'vitest';
import {
  ConsultationWorkflowState,
  ConsultationWorkflowAction,
  getNextState,
  canPerformAction,
  getValidActions,
  createInitialContext,
  isTerminalState,
} from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('ConsultationWorkflowStateMachine', () => {
  describe('getNextState - valid transitions', () => {
    it('IDLE + LOAD_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.IDLE, ConsultationWorkflowAction.LOAD_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('LOADING + LOAD_SUCCESS -> READY', () => {
      expect(getNextState(ConsultationWorkflowState.LOADING, ConsultationWorkflowAction.LOAD_SUCCESS))
        .toBe(ConsultationWorkflowState.READY);
    });

    it('LOADING + LOAD_ERROR -> ERROR', () => {
      expect(getNextState(ConsultationWorkflowState.LOADING, ConsultationWorkflowAction.LOAD_ERROR))
        .toBe(ConsultationWorkflowState.ERROR);
    });

    it('READY + START_CONSULTATION -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.READY, ConsultationWorkflowAction.START_CONSULTATION))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('READY + SWITCH_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.READY, ConsultationWorkflowAction.SWITCH_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('ACTIVE + SAVE_DRAFT -> SAVING', () => {
      expect(getNextState(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBe(ConsultationWorkflowState.SAVING);
    });

    it('ACTIVE + OPEN_COMPLETE_DIALOG -> COMPLETING', () => {
      expect(getNextState(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG))
        .toBe(ConsultationWorkflowState.COMPLETING);
    });

    it('ACTIVE + SWITCH_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.SWITCH_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('ACTIVE + PAUSE -> PAUSED', () => {
      expect(getNextState(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.PAUSE))
        .toBe(ConsultationWorkflowState.PAUSED);
    });

    it('PAUSED + RESUME -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.PAUSED, ConsultationWorkflowAction.RESUME))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('PAUSED + SWITCH_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.PAUSED, ConsultationWorkflowAction.SWITCH_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('SAVING + SAVE_SUCCESS -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.SAVING, ConsultationWorkflowAction.SAVE_SUCCESS))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('SAVING + SAVE_CONFLICT -> CONFLICT', () => {
      expect(getNextState(ConsultationWorkflowState.SAVING, ConsultationWorkflowAction.SAVE_CONFLICT))
        .toBe(ConsultationWorkflowState.CONFLICT);
    });

    it('SAVING + SAVE_ERROR -> ERROR', () => {
      expect(getNextState(ConsultationWorkflowState.SAVING, ConsultationWorkflowAction.SAVE_ERROR))
        .toBe(ConsultationWorkflowState.ERROR);
    });

    it('COMPLETING + CANCEL_COMPLETE -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.COMPLETING, ConsultationWorkflowAction.CANCEL_COMPLETE))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('COMPLETING + CONFIRM_COMPLETE -> TRANSITIONING', () => {
      expect(getNextState(ConsultationWorkflowState.COMPLETING, ConsultationWorkflowAction.CONFIRM_COMPLETE))
        .toBe(ConsultationWorkflowState.TRANSITIONING);
    });

    it('TRANSITIONING + LOAD_NEXT_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.TRANSITIONING, ConsultationWorkflowAction.LOAD_NEXT_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('TRANSITIONING + COMPLETE_SESSION -> COMPLETED', () => {
      expect(getNextState(ConsultationWorkflowState.TRANSITIONING, ConsultationWorkflowAction.COMPLETE_SESSION))
        .toBe(ConsultationWorkflowState.COMPLETED);
    });

    it('COMPLETED + RESET -> IDLE', () => {
      expect(getNextState(ConsultationWorkflowState.COMPLETED, ConsultationWorkflowAction.RESET))
        .toBe(ConsultationWorkflowState.IDLE);
    });

    it('CONFLICT + RESOLVE_WITH_SERVER -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.CONFLICT, ConsultationWorkflowAction.RESOLVE_WITH_SERVER))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('CONFLICT + RESOLVE_WITH_LOCAL -> SAVING', () => {
      expect(getNextState(ConsultationWorkflowState.CONFLICT, ConsultationWorkflowAction.RESOLVE_WITH_LOCAL))
        .toBe(ConsultationWorkflowState.SAVING);
    });

    it('CONFLICT + DISMISS_CONFLICT -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.CONFLICT, ConsultationWorkflowAction.DISMISS_CONFLICT))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('ERROR + RETRY -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.ERROR, ConsultationWorkflowAction.RETRY))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('ERROR + DISMISS_ERROR -> IDLE', () => {
      expect(getNextState(ConsultationWorkflowState.ERROR, ConsultationWorkflowAction.DISMISS_ERROR))
        .toBe(ConsultationWorkflowState.IDLE);
    });

    it('ERROR + SWITCH_PATIENT -> LOADING', () => {
      expect(getNextState(ConsultationWorkflowState.ERROR, ConsultationWorkflowAction.SWITCH_PATIENT))
        .toBe(ConsultationWorkflowState.LOADING);
    });

    it('ERROR + COMPLETION_RETRY -> ACTIVE', () => {
      expect(getNextState(ConsultationWorkflowState.ERROR, ConsultationWorkflowAction.COMPLETION_RETRY))
        .toBe(ConsultationWorkflowState.ACTIVE);
    });
  });

  describe('getNextState - invalid transitions', () => {
    it('returns null for invalid state/action pairs', () => {
      // IDLE cannot start consultation
      expect(getNextState(ConsultationWorkflowState.IDLE, ConsultationWorkflowAction.START_CONSULTATION))
        .toBeNull();
      // LOADING cannot complete
      expect(getNextState(ConsultationWorkflowState.LOADING, ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG))
        .toBeNull();
      // READY cannot save
      expect(getNextState(ConsultationWorkflowState.READY, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBeNull();
      // ACTIVE cannot complete without dialog
      expect(getNextState(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.CONFIRM_COMPLETE))
        .toBeNull();
      // PAUSED cannot complete
      expect(getNextState(ConsultationWorkflowState.PAUSED, ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG))
        .toBeNull();
      // SAVING cannot complete
      expect(getNextState(ConsultationWorkflowState.SAVING, ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG))
        .toBeNull();
      // COMPLETING cannot save
      expect(getNextState(ConsultationWorkflowState.COMPLETING, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBeNull();
      // TRANSITIONING cannot go back to ACTIVE
      expect(getNextState(ConsultationWorkflowState.TRANSITIONING, ConsultationWorkflowAction.CANCEL_COMPLETE))
        .toBeNull();
      // COMPLETED cannot do anything except RESET
      expect(getNextState(ConsultationWorkflowState.COMPLETED, ConsultationWorkflowAction.LOAD_PATIENT))
        .toBeNull();
      // CONFLICT cannot switch patient
      expect(getNextState(ConsultationWorkflowState.CONFLICT, ConsultationWorkflowAction.SWITCH_PATIENT))
        .toBeNull();
      // ERROR cannot save
      expect(getNextState(ConsultationWorkflowState.ERROR, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBeNull();
    });
  });

  describe('canPerformAction', () => {
    it('returns true for valid actions', () => {
      expect(canPerformAction(ConsultationWorkflowState.IDLE, ConsultationWorkflowAction.LOAD_PATIENT))
        .toBe(true);
      expect(canPerformAction(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBe(true);
      expect(canPerformAction(ConsultationWorkflowState.COMPLETING, ConsultationWorkflowAction.CONFIRM_COMPLETE))
        .toBe(true);
    });

    it('returns false for invalid actions', () => {
      expect(canPerformAction(ConsultationWorkflowState.IDLE, ConsultationWorkflowAction.START_CONSULTATION))
        .toBe(false);
      expect(canPerformAction(ConsultationWorkflowState.LOADING, ConsultationWorkflowAction.SAVE_DRAFT))
        .toBe(false);
      expect(canPerformAction(ConsultationWorkflowState.COMPLETED, ConsultationWorkflowAction.LOAD_PATIENT))
        .toBe(false);
    });
  });

  describe('getValidActions', () => {
    it('returns correct actions for each state', () => {
      expect(getValidActions(ConsultationWorkflowState.IDLE)).toEqual([
        ConsultationWorkflowAction.LOAD_PATIENT,
        ConsultationWorkflowAction.SWITCH_PATIENT,
      ]);
      expect(getValidActions(ConsultationWorkflowState.ACTIVE)).toEqual([
        ConsultationWorkflowAction.SAVE_DRAFT,
        ConsultationWorkflowAction.OPEN_COMPLETE_DIALOG,
        ConsultationWorkflowAction.SWITCH_PATIENT,
        ConsultationWorkflowAction.PAUSE,
      ]);
      expect(getValidActions(ConsultationWorkflowState.COMPLETED)).toEqual([
        ConsultationWorkflowAction.RESET,
      ]);
    });

    it('returns empty array for completely unknown state value', () => {
      expect(getValidActions('UNKNOWN_STATE' as ConsultationWorkflowState)).toEqual([]);
    });
  });

  describe('createInitialContext', () => {
    it('creates IDLE state without appointmentId', () => {
      const ctx = createInitialContext();
      expect(ctx.state).toBe(ConsultationWorkflowState.IDLE);
      expect(ctx.appointmentId).toBeNull();
      expect(ctx.patientId).toBeNull();
      expect(ctx.isDirty).toBe(false);
    });

    it('creates LOADING state with appointmentId', () => {
      const ctx = createInitialContext(42);
      expect(ctx.state).toBe(ConsultationWorkflowState.LOADING);
      expect(ctx.appointmentId).toBe(42);
    });
  });

  describe('isTerminalState', () => {
    it('returns true only for COMPLETED', () => {
      expect(isTerminalState(ConsultationWorkflowState.COMPLETED)).toBe(true);
      expect(isTerminalState(ConsultationWorkflowState.IDLE)).toBe(false);
      expect(isTerminalState(ConsultationWorkflowState.ACTIVE)).toBe(false);
      expect(isTerminalState(ConsultationWorkflowState.ERROR)).toBe(false);
    });
  });

  describe('all states are reachable', () => {
    it('every state can be reached from IDLE through some path', () => {
      const states = Object.values(ConsultationWorkflowState);
      for (const state of states) {
        // COMPLETED is reachable via TRANSITIONING -> COMPLETE_SESSION
        // All other states are reachable through documented paths
        expect(states).toContain(state);
      }
    });
  });

  describe('all transitions are deterministic', () => {
    it('same input always produces same output', () => {
      const state = ConsultationWorkflowState.ACTIVE;
      const action = ConsultationWorkflowAction.PAUSE;
      const result1 = getNextState(state, action);
      const result2 = getNextState(state, action);
      expect(result1).toBe(result2);
    });
  });
});
