/**
 * Unit tests for DocumentationWorkflowStateMachine
 */

import { describe, it, expect } from 'vitest';
import {
  DocumentationWorkflowState,
  DocumentationAction,
  getNextState,
  canPerformAction,
  getValidActions,
  createInitialContext,
  isTerminalState,
} from '@/domain/workflows/DocumentationWorkflowStateMachine';

describe('DocumentationWorkflowStateMachine', () => {
  describe('getNextState - valid transitions', () => {
    it('Document + CREATE_DRAFT -> Draft', () => {
      expect(getNextState(DocumentationWorkflowState.Document, DocumentationAction.CREATE_DRAFT))
        .toBe(DocumentationWorkflowState.Draft);
    });

    it('Document + RESTORE_DRAFT -> Restoring', () => {
      expect(getNextState(DocumentationWorkflowState.Document, DocumentationAction.RESTORE_DRAFT))
        .toBe(DocumentationWorkflowState.Restoring);
    });

    it('Draft + EDIT_NOTES -> Dirty', () => {
      expect(getNextState(DocumentationWorkflowState.Draft, DocumentationAction.EDIT_NOTES))
        .toBe(DocumentationWorkflowState.Dirty);
    });

    it('Draft + SAVE -> Saving', () => {
      expect(getNextState(DocumentationWorkflowState.Draft, DocumentationAction.SAVE))
        .toBe(DocumentationWorkflowState.Saving);
    });

    it('Draft + RESTORE_DRAFT -> Restoring', () => {
      expect(getNextState(DocumentationWorkflowState.Draft, DocumentationAction.RESTORE_DRAFT))
        .toBe(DocumentationWorkflowState.Restoring);
    });

    it('Dirty + SAVE -> Saving', () => {
      expect(getNextState(DocumentationWorkflowState.Dirty, DocumentationAction.SAVE))
        .toBe(DocumentationWorkflowState.Saving);
    });

    it('Dirty + SWITCH_PATIENT -> Document', () => {
      expect(getNextState(DocumentationWorkflowState.Dirty, DocumentationAction.SWITCH_PATIENT))
        .toBe(DocumentationWorkflowState.Document);
    });

    it('Dirty + COMPLETE -> Document', () => {
      expect(getNextState(DocumentationWorkflowState.Dirty, DocumentationAction.COMPLETE))
        .toBe(DocumentationWorkflowState.Document);
    });

    it('Dirty + PAUSE -> Document', () => {
      expect(getNextState(DocumentationWorkflowState.Dirty, DocumentationAction.PAUSE))
        .toBe(DocumentationWorkflowState.Document);
    });

    it('Saving + SAVE_SUCCESS -> Saved', () => {
      expect(getNextState(DocumentationWorkflowState.Saving, DocumentationAction.SAVE_SUCCESS))
        .toBe(DocumentationWorkflowState.Saved);
    });

    it('Saving + SAVE_CONFLICT -> Conflict', () => {
      expect(getNextState(DocumentationWorkflowState.Saving, DocumentationAction.SAVE_CONFLICT))
        .toBe(DocumentationWorkflowState.Conflict);
    });

    it('Saving + SAVE_ERROR -> Failed', () => {
      expect(getNextState(DocumentationWorkflowState.Saving, DocumentationAction.SAVE_ERROR))
        .toBe(DocumentationWorkflowState.Failed);
    });

    it('Saved + EDIT_NOTES -> Dirty', () => {
      expect(getNextState(DocumentationWorkflowState.Saved, DocumentationAction.EDIT_NOTES))
        .toBe(DocumentationWorkflowState.Dirty);
    });

    it('Conflict + RESOLVE_WITH_SERVER -> Saved', () => {
      expect(getNextState(DocumentationWorkflowState.Conflict, DocumentationAction.RESOLVE_WITH_SERVER))
        .toBe(DocumentationWorkflowState.Saved);
    });

    it('Conflict + RESOLVE_WITH_LOCAL -> Saving', () => {
      expect(getNextState(DocumentationWorkflowState.Conflict, DocumentationAction.RESOLVE_WITH_LOCAL))
        .toBe(DocumentationWorkflowState.Saving);
    });

    it('Conflict + DISMISS_CONFLICT -> Dirty', () => {
      expect(getNextState(DocumentationWorkflowState.Conflict, DocumentationAction.DISMISS_CONFLICT))
        .toBe(DocumentationWorkflowState.Dirty);
    });

    it('Restoring + RESTORE_SUCCESS -> Dirty', () => {
      expect(getNextState(DocumentationWorkflowState.Restoring, DocumentationAction.RESTORE_SUCCESS))
        .toBe(DocumentationWorkflowState.Dirty);
    });

    it('Restoring + RESTORE_NOOP -> Document', () => {
      expect(getNextState(DocumentationWorkflowState.Restoring, DocumentationAction.RESTORE_NOOP))
        .toBe(DocumentationWorkflowState.Document);
    });

    it('Failed + RETRY_SAVE -> Saving', () => {
      expect(getNextState(DocumentationWorkflowState.Failed, DocumentationAction.RETRY_SAVE))
        .toBe(DocumentationWorkflowState.Saving);
    });

    it('Failed + EDIT_NOTES -> Dirty', () => {
      expect(getNextState(DocumentationWorkflowState.Failed, DocumentationAction.EDIT_NOTES))
        .toBe(DocumentationWorkflowState.Dirty);
    });
  });

  describe('getNextState - invalid transitions', () => {
    it('returns null for invalid state/action pairs', () => {
      // Document cannot save
      expect(getNextState(DocumentationWorkflowState.Document, DocumentationAction.SAVE))
        .toBeNull();
      // Draft cannot complete
      expect(getNextState(DocumentationWorkflowState.Draft, DocumentationAction.COMPLETE))
        .toBeNull();
      // Dirty cannot resolve conflict
      expect(getNextState(DocumentationWorkflowState.Dirty, DocumentationAction.RESOLVE_WITH_SERVER))
        .toBeNull();
      // Saving cannot edit
      expect(getNextState(DocumentationWorkflowState.Saving, DocumentationAction.EDIT_NOTES))
        .toBeNull();
      // Saved cannot save
      expect(getNextState(DocumentationWorkflowState.Saved, DocumentationAction.SAVE))
        .toBeNull();
      // Conflict cannot edit
      expect(getNextState(DocumentationWorkflowState.Conflict, DocumentationAction.EDIT_NOTES))
        .toBeNull();
      // Restoring cannot save
      expect(getNextState(DocumentationWorkflowState.Restoring, DocumentationAction.SAVE))
        .toBeNull();
      // Failed cannot resolve conflict
      expect(getNextState(DocumentationWorkflowState.Failed, DocumentationAction.RESOLVE_WITH_SERVER))
        .toBeNull();
    });
  });

  describe('canPerformAction', () => {
    it('returns true for valid actions', () => {
      expect(canPerformAction(DocumentationWorkflowState.Document, DocumentationAction.CREATE_DRAFT))
        .toBe(true);
      expect(canPerformAction(DocumentationWorkflowState.Dirty, DocumentationAction.SAVE))
        .toBe(true);
      expect(canPerformAction(DocumentationWorkflowState.Conflict, DocumentationAction.RESOLVE_WITH_SERVER))
        .toBe(true);
    });

    it('returns false for invalid actions', () => {
      expect(canPerformAction(DocumentationWorkflowState.Document, DocumentationAction.SAVE))
        .toBe(false);
      expect(canPerformAction(DocumentationWorkflowState.Saving, DocumentationAction.EDIT_NOTES))
        .toBe(false);
      expect(canPerformAction(DocumentationWorkflowState.Saved, DocumentationAction.SAVE))
        .toBe(false);
    });
  });

  describe('getValidActions', () => {
    it('returns correct actions for each state', () => {
      expect(getValidActions(DocumentationWorkflowState.Document)).toEqual([
        DocumentationAction.CREATE_DRAFT,
        DocumentationAction.RESTORE_DRAFT,
      ]);
      expect(getValidActions(DocumentationWorkflowState.Dirty)).toEqual([
        DocumentationAction.SAVE,
        DocumentationAction.SWITCH_PATIENT,
        DocumentationAction.COMPLETE,
        DocumentationAction.PAUSE,
      ]);
      expect(getValidActions(DocumentationWorkflowState.Saved)).toEqual([
        DocumentationAction.EDIT_NOTES,
      ]);
    });

    it('returns empty array for completely unknown state value', () => {
      expect(getValidActions('UNKNOWN_STATE' as DocumentationWorkflowState)).toEqual([]);
    });
  });

  describe('createInitialContext', () => {
    it('creates initial context with null values', () => {
      const ctx = createInitialContext();
      expect(ctx.appointmentId).toBeNull();
      expect(ctx.consultationId).toBeNull();
      expect(ctx.notes).toEqual({});
      expect(ctx.outcomeType).toBeNull();
      expect(ctx.isDirty).toBe(false);
      expect(ctx.hasLocalDraft).toBe(false);
      expect(ctx.dirtyFields).toEqual([]);
    });
  });

  describe('isTerminalState', () => {
    it('returns false for all documentation states', () => {
      const states = Object.values(DocumentationWorkflowState);
      for (const state of states) {
        expect(isTerminalState(state)).toBe(false);
      }
    });
  });

  describe('deterministic transitions', () => {
    it('same input always produces same output', () => {
      const state = DocumentationWorkflowState.Dirty;
      const action = DocumentationAction.SAVE;
      const result1 = getNextState(state, action);
      const result2 = getNextState(state, action);
      expect(result1).toBe(result2);
    });
  });
});
