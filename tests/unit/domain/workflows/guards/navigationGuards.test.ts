import { describe, it, expect } from 'vitest';
import {
  G_051_NextPatientExists,
  G_052_NextPatientNotCurrent,
  G_053_DoctorAuthorizedForNext,
  G_054_NoNextPatient,
  G_055_AllCachesInvalidated,
  G_056_CompletedOrNewSession,
} from '@/domain/workflows/guards/navigationGuards';
import { buildGuardContext } from '../buildGuardContext';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

describe('navigationGuards', () => {
  const baseCtx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.TRANSITIONING });

  describe('G-051 NextPatientExists', () => {
    it('passes with next inConsultation', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [{ id: 2, patientId: 'patient-2' }], waiting: [] } });
      expect(G_051_NextPatientExists(ctx).passed).toBe(true);
    });
    it('passes with next waiting', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [], waiting: [{ id: 2, patientId: 'patient-2' }] } });
      expect(G_051_NextPatientExists(ctx).passed).toBe(true);
    });
    it('fails with empty queue', () => {
      expect(G_051_NextPatientExists(baseCtx).passed).toBe(false);
      expect(G_051_NextPatientExists(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-052 NextPatientNotCurrent', () => {
    it('passes when next is different', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [{ id: 2, patientId: 'patient-2' }], waiting: [] }, appointmentId: 1 });
      expect(G_052_NextPatientNotCurrent(ctx).passed).toBe(true);
    });
    it('fails when next is same', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [{ id: 1, patientId: 'patient-1' }], waiting: [] }, appointmentId: 1 });
      expect(G_052_NextPatientNotCurrent(ctx).passed).toBe(false);
      expect(G_052_NextPatientNotCurrent(ctx).clinicalRisk).toBe('high');
    });
  });

  describe('G-053 DoctorAuthorizedForNext', () => {
    it('passes with valid next patient', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [{ id: 2, patientId: 'patient-2' }], waiting: [] } });
      expect(G_053_DoctorAuthorizedForNext(ctx).passed).toBe(true);
    });
    it('passes when there is no next patient (G-051 blocks first)', () => {
      expect(G_053_DoctorAuthorizedForNext(baseCtx).passed).toBe(true);
    });
  });

  describe('G-054 NoNextPatient', () => {
    it('passes when queue is empty', () => {
      expect(G_054_NoNextPatient(baseCtx).passed).toBe(true);
    });
    it('fails when next patient exists', () => {
      const ctx = buildGuardContext({ queue: { inConsultation: [{ id: 2, patientId: 'patient-2' }], waiting: [] } });
      expect(G_054_NoNextPatient(ctx).passed).toBe(false);
      expect(G_054_NoNextPatient(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-055 AllCachesInvalidated', () => {
    it('passes when caches invalidated', () => {
      const ctx = buildGuardContext({ metadata: { cachesInvalidated: true } });
      expect(G_055_AllCachesInvalidated(ctx).passed).toBe(true);
    });
    it('fails when caches not invalidated', () => {
      expect(G_055_AllCachesInvalidated(baseCtx).passed).toBe(false);
      expect(G_055_AllCachesInvalidated(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-056 CompletedOrNewSession', () => {
    it('passes when previous state is COMPLETED', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.COMPLETED, metadata: { previousState: ConsultationWorkflowState.COMPLETED } });
      expect(G_056_CompletedOrNewSession(ctx).passed).toBe(true);
    });
    it('fails when previous state is not COMPLETED', () => {
      const ctx = buildGuardContext({ consultationWorkflowState: ConsultationWorkflowState.IDLE, metadata: { previousState: ConsultationWorkflowState.IDLE } });
      expect(G_056_CompletedOrNewSession(ctx).passed).toBe(false);
      expect(G_056_CompletedOrNewSession(ctx).clinicalRisk).toBe('low');
    });
  });
});
