/**
 * Unit tests for consultation flow guards.
 *
 * G-012: AppointmentStatusAllowsStart
 * G-013: DoctorAssigned
 * G-014: AppointmentNotCompleted
 * G-015: NoActiveConflict
 * G-016: TargetAppointmentExists
 * G-017: DraftSavedOrUserConfirmed
 * G-018: SaveTimeoutCleared
 * G-019: ConsultingNotOwnedByOther
 * G-020: CurrentSessionClean
 * G-021: ConsultationInProgress
 * G-022: AppointmentNotCompleted (save context)
 * G-023: NotAlreadySaving
 * G-024: NotesPresent
 * G-025: DoctorIdPresent
 * G-026: ConsultationIdPresent
 * G-027: ConsultationInProgress (complete context)
 * G-028: AppointmentNotTerminal
 * G-029: UserRoleDoctor
 * G-030: NoActiveSave
 * G-031: NoActiveConflict (complete context)
 * G-032: PatientNotDeceased
 */

import { describe, it, expect } from 'vitest';
import {
  G_012_AppointmentStatusAllowsStart,
  G_013_DoctorAssigned,
  G_014_AppointmentNotCompleted,
  G_015_NoActiveConflict,
  G_016_TargetAppointmentExists,
  G_017_DraftSavedOrUserConfirmed,
  G_018_SaveTimeoutCleared,
  G_019_ConsultingNotOwnedByOther,
  G_020_CurrentSessionClean,
  G_021_ConsultationInProgress,
  G_022_AppointmentNotCompleted as G_022_SaveAppointmentNotCompleted,
  G_023_NotAlreadySaving,
  G_024_NotesPresent,
  G_025_DoctorIdPresent,
  G_026_ConsultationIdPresent,
  G_027_ConsultationInProgress as G_027_CompleteConsultationInProgress,
  G_028_AppointmentNotTerminal,
  G_029_UserRoleDoctor,
  G_030_NoActiveSave,
  G_031_NoActiveConflict as G_031_NoActiveConflictComplete,
  G_032_PatientNotDeceased,
} from '@/domain/workflows/guards/consultationFlowGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('consultationFlowGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.READY });

  describe('G-012 AppointmentStatusAllowsStart', () => {
    it('passes with CHECKED_IN', () => {
      expect(G_012_AppointmentStatusAllowsStart(baseCtx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'COMPLETED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_012_AppointmentStatusAllowsStart(ctx).passed).toBe(false);
      expect(G_012_AppointmentStatusAllowsStart(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-013 DoctorAssigned', () => {
    it('passes when doctorId matches', () => {
      expect(G_013_DoctorAssigned(baseCtx).passed).toBe(true);
    });
    it('fails when doctorId mismatches', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-2', status: 'CHECKED_IN', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' } });
      expect(G_013_DoctorAssigned(ctx).passed).toBe(false);
      expect(G_013_DoctorAssigned(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-014 AppointmentNotCompleted', () => {
    it('passes with CHECKED_IN', () => {
      expect(G_014_AppointmentNotCompleted(baseCtx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'COMPLETED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_014_AppointmentNotCompleted(ctx).passed).toBe(false);
      expect(G_014_AppointmentNotCompleted(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-015 NoActiveConflict', () => {
    it('passes when not in Conflict', () => {
      expect(G_015_NoActiveConflict(baseCtx).passed).toBe(true);
    });
    it('fails in Conflict state', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Conflict' });
      expect(G_015_NoActiveConflict(ctx).passed).toBe(false);
      expect(G_015_NoActiveConflict(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-016 TargetAppointmentExists', () => {
    it('passes with valid different appointmentId', () => {
      const ctx = buildGuardContext({ metadata: { targetAppointmentId: 99 }, appointmentId: 1 });
      expect(G_016_TargetAppointmentExists(ctx).passed).toBe(true);
    });
    it('fails when target matches current', () => {
      const ctx = buildGuardContext({ metadata: { targetAppointmentId: 1 }, appointmentId: 1 });
      expect(G_016_TargetAppointmentExists(ctx).passed).toBe(false);
      expect(G_016_TargetAppointmentExists(ctx).clinicalRisk).toBe('high');
    });
    it('fails when target is missing', () => {
      const ctx = buildGuardContext({ appointmentId: 1, metadata: {} });
      expect(G_016_TargetAppointmentExists(ctx).passed).toBe(false);
    });
  });

  describe('G-017 DraftSavedOrUserConfirmed', () => {
    it('passes when not dirty', () => {
      const ctx = buildGuardContext({ isDirty: false });
      expect(G_017_DraftSavedOrUserConfirmed(ctx).passed).toBe(true);
    });
    it('passes when dirty and user confirmed', () => {
      const ctx = buildGuardContext({ isDirty: true, metadata: { userConfirmedSwitch: true } });
      expect(G_017_DraftSavedOrUserConfirmed(ctx).passed).toBe(true);
    });
    it('fails when dirty and no confirmation', () => {
      const ctx = buildGuardContext({ isDirty: true, metadata: {} });
      expect(G_017_DraftSavedOrUserConfirmed(ctx).passed).toBe(false);
      expect(G_017_DraftSavedOrUserConfirmed(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-018 SaveTimeoutCleared', () => {
    it('passes when not dirty', () => {
      expect(G_018_SaveTimeoutCleared(baseCtx).passed).toBe(true);
    });
    it('passes when timeout explicitly cleared', () => {
      const ctx = buildGuardContext({ isDirty: true, metadata: { saveTimeoutCleared: true } });
      expect(G_018_SaveTimeoutCleared(ctx).passed).toBe(true);
    });
    it('fails when dirty and timeout not cleared', () => {
      const ctx = buildGuardContext({ isDirty: true, metadata: { saveTimeoutCleared: false } });
      expect(G_018_SaveTimeoutCleared(ctx).passed).toBe(false);
      expect(G_018_SaveTimeoutCleared(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-019 ConsultingNotOwnedByOther', () => {
    it('passes with valid target different from current', () => {
      const ctx = buildGuardContext({ metadata: { targetAppointmentId: 99 }, appointmentId: 1 });
      expect(G_019_ConsultingNotOwnedByOther(ctx).passed).toBe(true);
    });
    it('fails when target is same as current', () => {
      const ctx = buildGuardContext({ metadata: { targetAppointmentId: 1 }, appointmentId: 1 });
      expect(G_019_ConsultingNotOwnedByOther(ctx).passed).toBe(false);
      expect(G_019_ConsultingNotOwnedByOther(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-020 CurrentSessionClean', () => {
    it('passes when not dirty', () => {
      expect(G_020_CurrentSessionClean(baseCtx).passed).toBe(true);
    });
    it('fails when dirty', () => {
      const ctx = buildGuardContext({ isDirty: true });
      expect(G_020_CurrentSessionClean(ctx).passed).toBe(false);
      expect(G_020_CurrentSessionClean(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-021 ConsultationInProgress', () => {
    it('passes with IN_PROGRESS', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_021_ConsultationInProgress(ctx).passed).toBe(true);
    });
    it('fails with NOT_STARTED', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_021_ConsultationInProgress(ctx).passed).toBe(false);
      expect(G_021_ConsultationInProgress(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-022 AppointmentNotCompleted (save)', () => {
    it('passes with SCHEDULED', () => {
      expect(G_022_SaveAppointmentNotCompleted(baseCtx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'COMPLETED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_022_SaveAppointmentNotCompleted(ctx).passed).toBe(false);
      expect(G_022_SaveAppointmentNotCompleted(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-023 NotAlreadySaving', () => {
    it('passes when not Saving', () => {
      expect(G_023_NotAlreadySaving(baseCtx).passed).toBe(true);
    });
    it('fails when already Saving', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Saving' });
      expect(G_023_NotAlreadySaving(ctx).passed).toBe(false);
      expect(G_023_NotAlreadySaving(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-024 NotesPresent', () => {
    it('passes with notes present', () => {
      expect(G_024_NotesPresent(baseCtx).passed).toBe(true);
    });
    it('fails with null notes', () => {
      const ctx = buildGuardContext({ notes: null as any });
      expect(G_024_NotesPresent(ctx).passed).toBe(false);
      expect(G_024_NotesPresent(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-025 DoctorIdPresent', () => {
    it('passes with doctorId present', () => {
      expect(G_025_DoctorIdPresent(baseCtx).passed).toBe(true);
    });
    it('fails with null doctorId', () => {
      const ctx = buildGuardContext({ doctorId: null });
      expect(G_025_DoctorIdPresent(ctx).passed).toBe(false);
      expect(G_025_DoctorIdPresent(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-026 ConsultationIdPresent', () => {
    it('passes with consultationId present', () => {
      expect(G_026_ConsultationIdPresent(baseCtx).passed).toBe(true);
    });
    it('fails with null consultationId', () => {
      const ctx = buildGuardContext({ consultationId: null });
      expect(G_026_ConsultationIdPresent(ctx).passed).toBe(false);
      expect(G_026_ConsultationIdPresent(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-027 ConsultationInProgress (complete)', () => {
    it('passes with IN_PROGRESS', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_027_CompleteConsultationInProgress(ctx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'COMPLETED', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_027_CompleteConsultationInProgress(ctx).passed).toBe(false);
      expect(G_027_CompleteConsultationInProgress(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-028 AppointmentNotTerminal', () => {
    it('passes with SCHEDULED', () => {
      expect(G_028_AppointmentNotTerminal(baseCtx).passed).toBe(true);
    });
    it('fails with CANCELLED', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CANCELLED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_028_AppointmentNotTerminal(ctx).passed).toBe(false);
      expect(G_028_AppointmentNotTerminal(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-029 UserRoleDoctor', () => {
    it('passes with DOCTOR role', () => {
      expect(G_029_UserRoleDoctor(baseCtx).passed).toBe(true);
    });
    it('fails with NURSE role', () => {
      const ctx = buildGuardContext({ user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' } });
      expect(G_029_UserRoleDoctor(ctx).passed).toBe(false);
      expect(G_029_UserRoleDoctor(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-030 NoActiveSave', () => {
    it('passes when not Saving', () => {
      expect(G_030_NoActiveSave(baseCtx).passed).toBe(true);
    });
    it('fails when Saving', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Saving' });
      expect(G_030_NoActiveSave(ctx).passed).toBe(false);
      expect(G_030_NoActiveSave(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-031 NoActiveConflict (complete)', () => {
    it('passes when not in Conflict', () => {
      expect(G_031_NoActiveConflictComplete(baseCtx).passed).toBe(true);
    });
    it('fails in Conflict state', () => {
      const ctx = buildGuardContext({ documentationWorkflowState: 'Conflict' });
      expect(G_031_NoActiveConflictComplete(ctx).passed).toBe(false);
      expect(G_031_NoActiveConflictComplete(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-032 PatientNotDeceased', () => {
    it('passes when not deceased', () => {
      expect(G_032_PatientNotDeceased(baseCtx).passed).toBe(true);
    });
    it('fails when deceased', () => {
      const ctx = buildGuardContext({ metadata: { patientDeceased: true } });
      expect(G_032_PatientNotDeceased(ctx).passed).toBe(false);
      expect(G_032_PatientNotDeceased(ctx).clinicalRisk).toBe('high');
    });
  });
});
