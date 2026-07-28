/**
 * Unit tests for completion guards.
 *
 * G-041: OutcomeSelected
 * G-042: NoPendingSave
 * G-043: UserConfirmedProceed
 * G-044: ConsultationInProgress
 * G-045: AppointmentNotCompleted
 * G-046: PatientIdentityVerified
 * G-047: VersionCurrent
 * G-048: BillingSummaryPresent
 * G-049: QueueOwnershipValid
 * G-050: AdvisoryWarningsReviewed
 */

import { describe, it, expect } from 'vitest';
import {
  G_041_OutcomeSelected,
  G_042_NoPendingSave,
  G_043_UserConfirmedProceed,
  G_044_ConsultationInProgress as G_044_ConfirmConsultationInProgress,
  G_045_AppointmentNotCompleted as G_045_ConfirmAppointmentNotCompleted,
  G_046_PatientIdentityVerified,
  G_047_VersionCurrent,
  G_048_BillingSummaryPresent,
  G_049_QueueOwnershipValid,
  G_050_AdvisoryWarningsReviewed,
} from '@/domain/workflows/guards/completionGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('completionGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.COMPLETING });

  describe('G-041 OutcomeSelected', () => {
    it('passes with outcomeType present', () => {
      expect(G_041_OutcomeSelected(baseCtx).passed).toBe(true);
    });
    it('fails with null outcomeType', () => {
      const ctx = buildGuardContext({ outcomeType: null });
      expect(G_041_OutcomeSelected(ctx).passed).toBe(false);
      expect(G_041_OutcomeSelected(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-042 NoPendingSave', () => {
    it('passes in Document state', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Document' });
      expect(G_042_NoPendingSave(ctx).passed).toBe(true);
    });
    it('passes in Draft state', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Draft' });
      expect(G_042_NoPendingSave(ctx).passed).toBe(true);
    });
    it('passes in Saved state', () => {
      expect(G_042_NoPendingSave(baseCtx).passed).toBe(true);
    });
    it('fails in Dirty state without override', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Dirty' });
      expect(G_042_NoPendingSave(ctx).passed).toBe(false);
      expect(G_042_NoPendingSave(ctx).clinicalRisk).toBe('high');
    });
    it('passes in Dirty state with user override', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Dirty', metadata: { userConfirmUnsaved: true } });
      expect(G_042_NoPendingSave(ctx).passed).toBe(true);
    });
  });

  describe('G-043 UserConfirmedProceed', () => {
    it('passes when documentation is not Failed', () => {
      expect(G_043_UserConfirmedProceed(baseCtx).passed).toBe(true);
    });
    it('passes in Failed state with user confirmation', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Failed', metadata: { userConfirmUnsaved: true } });
      expect(G_043_UserConfirmedProceed(ctx).passed).toBe(true);
    });
    it('fails in Failed state without confirmation', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Failed', metadata: {} });
      expect(G_043_UserConfirmedProceed(ctx).passed).toBe(false);
      expect(G_043_UserConfirmedProceed(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-044 ConsultationInProgress', () => {
    it('passes with IN_PROGRESS', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_044_ConfirmConsultationInProgress(ctx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'COMPLETED', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_044_ConfirmConsultationInProgress(ctx).passed).toBe(false);
      expect(G_044_ConfirmConsultationInProgress(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-045 AppointmentNotCompleted', () => {
    it('passes with SCHEDULED', () => {
      expect(G_045_ConfirmAppointmentNotCompleted(baseCtx).passed).toBe(true);
    });
    it('fails with CANCELLED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CANCELLED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_045_ConfirmAppointmentNotCompleted(ctx).passed).toBe(false);
      expect(G_045_ConfirmAppointmentNotCompleted(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-046 PatientIdentityVerified', () => {
    it('passes when patientId matches', () => {
      expect(G_046_PatientIdentityVerified(baseCtx).passed).toBe(true);
    });
    it('fails on mismatch', () => {
      const ctx = buildGuardContext({ patientId: 'patient-2' });
      expect(G_046_PatientIdentityVerified(ctx).passed).toBe(false);
      expect(G_046_PatientIdentityVerified(ctx).clinicalRisk).toBe('high');
    });
    it('fails when appointment missing', () => {
      const ctx = buildGuardContext({ appointment: null });
      expect(G_046_PatientIdentityVerified(ctx).passed).toBe(false);
      expect(G_046_PatientIdentityVerified(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-047 VersionCurrent', () => {
    it('passes when client <= server', () => {
      expect(G_047_VersionCurrent(baseCtx).passed).toBe(true);
    });
    it('passes when versions missing', () => {
      const ctx = buildGuardContext({ version: null, consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_047_VersionCurrent(ctx).passed).toBe(true);
    });
    it('fails when client ahead', () => {
      const ctx = buildGuardContext({ version: '2', consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_047_VersionCurrent(ctx).passed).toBe(false);
      expect(G_047_VersionCurrent(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-048 BillingSummaryPresent', () => {
    it('passes when billing summary present', () => {
      const ctx = buildGuardContext({ metadata: { billingSummary: { total: 100 } } });
      expect(G_048_BillingSummaryPresent(ctx).passed).toBe(true);
    });
    it('fails when billing summary missing', () => {
      expect(G_048_BillingSummaryPresent(baseCtx).passed).toBe(false);
      expect(G_048_BillingSummaryPresent(baseCtx).clinicalRisk).toBe('none');
    });
  });

  describe('G-049 QueueOwnershipValid', () => {
    it('passes when doctor matches appointment', () => {
      expect(G_049_QueueOwnershipValid(baseCtx).passed).toBe(true);
    });
    it('fails when doctor does not match', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-2', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' } });
      expect(G_049_QueueOwnershipValid(ctx).passed).toBe(false);
      expect(G_049_QueueOwnershipValid(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-050 AdvisoryWarningsReviewed', () => {
    it('passes with no warnings', () => {
      expect(G_050_AdvisoryWarningsReviewed(baseCtx).passed).toBe(true);
    });
    it('passes with non-critical unacknowledged warnings', () => {
      const ctx = buildGuardContext({ metadata: { advisoryWarnings: [{ critical: false, acknowledged: false }] } });
      expect(G_050_AdvisoryWarningsReviewed(ctx).passed).toBe(true);
    });
    it('fails with unacknowledged critical warnings', () => {
      const ctx = buildGuardContext({ metadata: { advisoryWarnings: [{ critical: true, acknowledged: false }] } });
      expect(G_050_AdvisoryWarningsReviewed(ctx).passed).toBe(false);
      expect(G_050_AdvisoryWarningsReviewed(ctx).clinicalRisk).toBe('high');
    });
  });
});
