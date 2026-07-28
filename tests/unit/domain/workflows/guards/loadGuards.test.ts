/**
 * Unit tests for load guards.
 *
 * G-001: ValidAppointmentId
 * G-002: UserAuthenticated
 * G-003: PatientNotArchived
 * G-004: AppointmentLoaded
 * G-005: PatientLoaded
 * G-006: DoctorLoaded
 * G-007: PatientIdentityPreserved
 * G-008: ConsultationStateValid
 * G-009: AppointmentStatusReady
 * G-010: AppointmentStatusActive
 * G-011: ErrorIsRecoverable
 */

import { describe, it, expect } from 'vitest';
import {
  G_001_ValidAppointmentId,
  G_002_UserAuthenticated,
  G_003_PatientNotArchived,
  G_004_AppointmentLoaded,
  G_005_PatientLoaded,
  G_006_DoctorLoaded,
  G_007_PatientIdentityPreserved,
  G_008_ConsultationStateValid,
  G_009_AppointmentStatusReady,
  G_010_AppointmentStatusActive,
  G_011_ErrorIsRecoverable,
} from '@/domain/workflows/guards/loadGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('loadGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.LOADING });

  describe('G-001 ValidAppointmentId', () => {
    it('passes with positive appointmentId', () => {
      const ctx = buildGuardContext({ appointmentId: 1 });
      expect(G_001_ValidAppointmentId(ctx).passed).toBe(true);
    });
    it('fails with appointmentId = 0', () => {
      const ctx = buildGuardContext({ appointmentId: 0 });
      expect(G_001_ValidAppointmentId(ctx).passed).toBe(false);
      expect(G_001_ValidAppointmentId(ctx).guardId).toBe('G-001');
    });
    it('fails with null appointmentId', () => {
      const ctx = buildGuardContext({ appointmentId: null });
      expect(G_001_ValidAppointmentId(ctx).passed).toBe(false);
    });
  });

  describe('G-002 UserAuthenticated', () => {
    it('passes with DOCTOR role', () => {
      const ctx = buildGuardContext({ user: { id: 'doc-1', role: 'DOCTOR', name: 'Dr. Smith' } });
      expect(G_002_UserAuthenticated(ctx).passed).toBe(true);
    });
    it('fails with NURSE role', () => {
      const ctx = buildGuardContext({ user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' } });
      expect(G_002_UserAuthenticated(ctx).passed).toBe(false);
      expect(G_002_UserAuthenticated(ctx).clinicalRisk).toBe('medium');
    });
    it('fails with null user', () => {
      const ctx = buildGuardContext({ user: null as any });
      expect(G_002_UserAuthenticated(ctx).passed).toBe(false);
    });
  });

  describe('G-003 PatientNotArchived', () => {
    it('passes when appointment exists', () => {
      expect(G_003_PatientNotArchived(baseCtx).passed).toBe(true);
    });
    it('fails when appointment is missing', () => {
      const ctx = buildGuardContext({ appointment: null });
      expect(G_003_PatientNotArchived(ctx).passed).toBe(false);
      expect(G_003_PatientNotArchived(ctx).guardId).toBe('G-003');
    });
  });

  describe('G-004 AppointmentLoaded', () => {
    it('passes with appointment present', () => {
      expect(G_004_AppointmentLoaded(baseCtx).passed).toBe(true);
    });
    it('fails when appointment is null', () => {
      const ctx = buildGuardContext({ appointment: null });
      expect(G_004_AppointmentLoaded(ctx).passed).toBe(false);
      expect(G_004_AppointmentLoaded(ctx).clinicalRisk).toBe('critical');
    });
  });

  describe('G-005 PatientLoaded', () => {
    it('passes with patientId present', () => {
      expect(G_005_PatientLoaded(baseCtx).passed).toBe(true);
    });
    it('fails when patientId is null', () => {
      const ctx = buildGuardContext({ patientId: null });
      expect(G_005_PatientLoaded(ctx).passed).toBe(false);
      expect(G_005_PatientLoaded(ctx).clinicalRisk).toBe('critical');
    });
  });

  describe('G-006 DoctorLoaded', () => {
    it('passes with doctorId present', () => {
      expect(G_006_DoctorLoaded(baseCtx).passed).toBe(true);
    });
    it('fails when doctorId is null', () => {
      const ctx = buildGuardContext({ doctorId: null });
      expect(G_006_DoctorLoaded(ctx).passed).toBe(false);
      expect(G_006_DoctorLoaded(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-007 PatientIdentityPreserved', () => {
    it('passes when patientId matches appointment', () => {
      expect(G_007_PatientIdentityPreserved(baseCtx).passed).toBe(true);
    });
    it('fails when patientId mismatches', () => {
      const ctx = buildGuardContext({ patientId: 'patient-2' });
      expect(G_007_PatientIdentityPreserved(ctx).passed).toBe(false);
      expect(G_007_PatientIdentityPreserved(ctx).clinicalRisk).toBe('high');
    });
    it('fails when appointment is missing', () => {
      const ctx = buildGuardContext({ appointment: null });
      expect(G_007_PatientIdentityPreserved(ctx).passed).toBe(false);
    });
  });

  describe('G-008 ConsultationStateValid', () => {
    it('passes with IN_PROGRESS', () => {
      expect(G_008_ConsultationStateValid(baseCtx).passed).toBe(true);
    });
    it('passes with NOT_STARTED', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_008_ConsultationStateValid(ctx).passed).toBe(true);
    });
    it('passes when consultation is missing', () => {
      expect(G_008_ConsultationStateValid(baseCtx).passed).toBe(true);
    });
    it('fails with COMPLETED', () => {
      const ctx = buildGuardContext({ consultation: { id: 1, appointmentId: 1, state: 'COMPLETED', version: '1', updatedAt: '2024-01-01T10:00:00Z' } });
      expect(G_008_ConsultationStateValid(ctx).passed).toBe(false);
      expect(G_008_ConsultationStateValid(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-009 AppointmentStatusReady', () => {
    it('passes with CHECKED_IN', () => {
      expect(G_009_AppointmentStatusReady(baseCtx).passed).toBe(true);
    });
    it('passes with READY_FOR_CONSULTATION', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'READY_FOR_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_009_AppointmentStatusReady(ctx).passed).toBe(true);
    });
    it('fails with IN_CONSULTATION', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_009_AppointmentStatusReady(ctx).passed).toBe(false);
      expect(G_009_AppointmentStatusReady(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-010 AppointmentStatusActive', () => {
    it('passes with IN_CONSULTATION', () => {
      const ctx = buildGuardContext({ appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 } });
      expect(G_010_AppointmentStatusActive(ctx).passed).toBe(true);
    });
    it('fails with CHECKED_IN', () => {
      expect(G_010_AppointmentStatusActive(baseCtx).passed).toBe(false);
      expect(G_010_AppointmentStatusActive(baseCtx).clinicalRisk).toBe('high');
    });
  });

  describe('G-011 ErrorIsRecoverable', () => {
    it('passes when errorType is missing', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.ERROR, metadata: {} });
      expect(G_011_ErrorIsRecoverable(ctx).passed).toBe(true);
    });
    it('passes with NETWORK_UNAVAILABLE', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.ERROR, metadata: { errorType: 'NETWORK_UNAVAILABLE' } });
      expect(G_011_ErrorIsRecoverable(ctx).passed).toBe(true);
    });
    it('fails with CORRUPTED_DB', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.ERROR, metadata: { errorType: 'CORRUPTED_DB' } });
      expect(G_011_ErrorIsRecoverable(ctx).passed).toBe(false);
      expect(G_011_ErrorIsRecoverable(ctx).clinicalRisk).toBe('low');
    });
  });
});
