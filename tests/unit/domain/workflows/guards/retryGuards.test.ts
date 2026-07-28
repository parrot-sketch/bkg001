/**
 * Unit tests for retry and error recovery guards.
 *
 * G-069: RetryCountNotExhausted
 * G-070: ErrorIsRetryable
 * G-071: UserInitiatedRetry
 * G-072: UserInitiatedDismiss
 * G-073: NoPendingMutations
 * G-074: PreviousStateWasCompleting
 * G-075: AppointmentStillActive
 * G-076: NoDataCorruption
 */

import { describe, it, expect } from 'vitest';
import {
  G_069_RetryCountNotExhausted,
  G_070_ErrorIsRetryable,
  G_071_UserInitiatedRetry,
  G_072_UserInitiatedDismiss,
  G_073_NoPendingMutations,
  G_074_PreviousStateWasCompleting,
  G_075_AppointmentStillActive,
  G_076_NoDataCorruption,
} from '@/domain/workflows/guards/retryGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('retryGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.ERROR });

  describe('G-069 RetryCountNotExhausted', () => {
    it('passes with retryCount = 0', () => {
      expect(G_069_RetryCountNotExhausted(baseCtx).passed).toBe(true);
    });
    it('passes with retryCount = 2', () => {
      const ctx = buildGuardContext({ retryCount: 2 });
      expect(G_069_RetryCountNotExhausted(ctx).passed).toBe(true);
    });
    it('fails with retryCount >= 3', () => {
      const ctx = buildGuardContext({ retryCount: 3 });
      expect(G_069_RetryCountNotExhausted(ctx).passed).toBe(false);
      expect(G_069_RetryCountNotExhausted(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-070 ErrorIsRetryable', () => {
    it('passes with NETWORK_UNAVAILABLE', () => {
      const ctx = buildGuardContext({ metadata: { errorType: 'NETWORK_UNAVAILABLE' } });
      expect(G_070_ErrorIsRetryable(ctx).passed).toBe(true);
    });
    it('passes with TIMEOUT', () => {
      const ctx = buildGuardContext({ metadata: { errorType: 'TIMEOUT' } });
      expect(G_070_ErrorIsRetryable(ctx).passed).toBe(true);
    });
    it('passes with HTTP_5XX', () => {
      const ctx = buildGuardContext({ metadata: { errorType: 'HTTP_5XX' } });
      expect(G_070_ErrorIsRetryable(ctx).passed).toBe(true);
    });
    it('passes with no errorType', () => {
      expect(G_070_ErrorIsRetryable(baseCtx).passed).toBe(true);
    });
    it('fails with 400 Bad Request', () => {
      const ctx = buildGuardContext({ metadata: { errorType: 'HTTP_400' } });
      expect(G_070_ErrorIsRetryable(ctx).passed).toBe(false);
      expect(G_070_ErrorIsRetryable(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-071 UserInitiatedRetry', () => {
    it('passes when user-initiated', () => {
      const ctx = buildGuardContext({ metadata: { userInitiated: true } });
      expect(G_071_UserInitiatedRetry(ctx).passed).toBe(true);
    });
    it('fails when automatic', () => {
      expect(G_071_UserInitiatedRetry(baseCtx).passed).toBe(false);
      expect(G_071_UserInitiatedRetry(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-072 UserInitiatedDismiss', () => {
    it('passes when user-initiated', () => {
      const ctx = buildGuardContext({ metadata: { userInitiated: true } });
      expect(G_072_UserInitiatedDismiss(ctx).passed).toBe(true);
    });
    it('fails when automatic', () => {
      expect(G_072_UserInitiatedDismiss(baseCtx).passed).toBe(false);
      expect(G_072_UserInitiatedDismiss(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-073 NoPendingMutations', () => {
    it('passes with 0 pending mutations', () => {
      expect(G_073_NoPendingMutations(baseCtx).passed).toBe(true);
    });
    it('fails with pending mutations', () => {
      const ctx = buildGuardContext({ metadata: { pendingMutations: 1 } });
      expect(G_073_NoPendingMutations(ctx).passed).toBe(false);
      expect(G_073_NoPendingMutations(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-074 PreviousStateWasCompleting', () => {
    it('passes from COMPLETING', () => {
      const ctx = buildGuardContext({ metadata: { previousState: ConsultationWorkflowState.COMPLETING } });
      expect(G_074_PreviousStateWasCompleting(ctx).passed).toBe(true);
    });
    it('passes from TRANSITIONING', () => {
      const ctx = buildGuardContext({ metadata: { previousState: ConsultationWorkflowState.TRANSITIONING } });
      expect(G_074_PreviousStateWasCompleting(ctx).passed).toBe(true);
    });
    it('fails from ACTIVE', () => {
      const ctx = buildGuardContext({ metadata: { previousState: ConsultationWorkflowState.ACTIVE } });
      expect(G_074_PreviousStateWasCompleting(ctx).passed).toBe(false);
      expect(G_074_PreviousStateWasCompleting(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-075 AppointmentStillActive', () => {
    it('passes with SCHEDULED', () => {
      expect(G_075_AppointmentStillActive(baseCtx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'COMPLETED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_075_AppointmentStillActive(ctx).passed).toBe(false);
      expect(G_075_AppointmentStillActive(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-076 NoDataCorruption', () => {
    it('passes when corruption not confirmed', () => {
      expect(G_076_NoDataCorruption(baseCtx).passed).toBe(true);
    });
    it('fails when data corruption confirmed', () => {
      const ctx = buildGuardContext({ metadata: { dataCorruptionConfirmed: true } });
      expect(G_076_NoDataCorruption(ctx).passed).toBe(false);
      expect(G_076_NoDataCorruption(ctx).clinicalRisk).toBe('medium');
    });
  });
});
