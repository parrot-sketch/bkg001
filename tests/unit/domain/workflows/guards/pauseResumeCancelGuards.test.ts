/**
 * Unit tests for pause, resume, and cancel guards.
 *
 * G-033: SessionActive
 * G-034: NoActiveSave
 * G-035: NoActiveConflict
 * G-036: NoPendingCompletion
 * G-040: DialogIsOpen
 */

import { describe, it, expect } from 'vitest';
import {
  G_033_SessionActive,
  G_034_NoActiveSave as G_034_PauseNoActiveSave,
  G_035_NoActiveConflict as G_035_PauseNoActiveConflict,
  G_036_NoPendingCompletion,
  G_040_DialogIsOpen,
} from '@/domain/workflows/guards/pauseResumeCancelGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('pauseResumeCancelGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.ACTIVE });

  describe('G-033 SessionActive', () => {
    it('passes when ACTIVE', () => {
      expect(G_033_SessionActive(baseCtx).passed).toBe(true);
    });
    it('fails when not ACTIVE', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.LOADING });
      expect(G_033_SessionActive(ctx).passed).toBe(false);
      expect(G_033_SessionActive(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-034 NoActiveSave', () => {
    it('passes when not Saving', () => {
      expect(G_034_PauseNoActiveSave(baseCtx).passed).toBe(true);
    });
    it('fails when Saving', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Saving' });
      expect(G_034_PauseNoActiveSave(ctx).passed).toBe(false);
      expect(G_034_PauseNoActiveSave(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-035 NoActiveConflict', () => {
    it('passes when not in Conflict', () => {
      expect(G_035_PauseNoActiveConflict(baseCtx).passed).toBe(true);
    });
    it('fails when in Conflict', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Conflict' });
      expect(G_035_PauseNoActiveConflict(ctx).passed).toBe(false);
      expect(G_035_PauseNoActiveConflict(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-036 NoPendingCompletion', () => {
    it('passes when dialog not open', () => {
      expect(G_036_NoPendingCompletion(baseCtx).passed).toBe(true);
    });
    it('fails when completion dialog is open', () => {
      const ctx = buildGuardContext({ metadata: { showCompleteDialog: true } });
      expect(G_036_NoPendingCompletion(ctx).passed).toBe(false);
      expect(G_036_NoPendingCompletion(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-040 DialogIsOpen', () => {
    it('passes when dialog is open', () => {
      const ctx = buildGuardContext({ metadata: { showCompleteDialog: true }, consultationWorkflowState: ConsultationWorkflowState.COMPLETING });
      expect(G_040_DialogIsOpen(ctx).passed).toBe(true);
    });
    it('fails when dialog is not open', () => {
      expect(G_040_DialogIsOpen(baseCtx).passed).toBe(false);
      expect(G_040_DialogIsOpen(baseCtx).clinicalRisk).toBe('low');
    });
  });
});
