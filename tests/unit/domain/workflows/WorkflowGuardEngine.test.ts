/**
 * Unit tests for WorkflowGuardEngine
 */

import { describe, it, expect } from 'vitest';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';
import { WorkflowGuardEngine } from '@/domain/workflows/WorkflowGuardEngine';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { ConsultationWorkflowAction } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { buildGuardContext } from './buildGuardContext';

describe('WorkflowGuardEngine', () => {
  let registry: DefaultGuardRegistry;
  let engine: WorkflowGuardEngine;

  beforeEach(() => {
    registry = new DefaultGuardRegistry();
    engine = new WorkflowGuardEngine(registry);
  });

  describe('validate', () => {
    it('returns passed=true when all guards pass', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'SCHEDULED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
        patientId: 'patient-1',
        metadata: {},
      });
      const result = engine.validate('IDLE', 'LOAD_PATIENT', ctx);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('returns passed=false with violations when any guard fails', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        patientId: 'patient-1',
        metadata: {},
      });
      const result = engine.validate('IDLE', 'LOAD_PATIENT', ctx);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('aggregates all guard failures when shortCircuit is false', () => {
      const engineNoShortCircuit = new WorkflowGuardEngine(registry, { shortCircuit: false });
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' },
        patientId: 'patient-1',
        metadata: {},
      });
      const result = engineNoShortCircuit.validate('IDLE', 'LOAD_PATIENT', ctx);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });

    it('short-circuits after first failure when shortCircuit is true', () => {
      const engineShortCircuit = new WorkflowGuardEngine(registry, { shortCircuit: true });
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' },
        patientId: 'patient-1',
        metadata: {},
      });
      const result = engineShortCircuit.validate('IDLE', 'LOAD_PATIENT', ctx);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(1);
    });

    it('deterministic ordering: same input produces same violations', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' },
        patientId: 'patient-1',
        metadata: {},
      });
      const result1 = engine.validate('IDLE', 'LOAD_PATIENT', ctx);
      const result2 = engine.validate('IDLE', 'LOAD_PATIENT', ctx);
      expect(result1.violations.map(v => v.guardId)).toEqual(result2.violations.map(v => v.guardId));
    });

    it('returns empty violations for valid transitions', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
        consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' },
        appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
        notes: { structured: { chiefComplaint: 'Headache' } },
        isDirty: true,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        metadata: {},
      });
      const result = engine.validate('ACTIVE', 'PAUSE', ctx);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('canTransition', () => {
    it('returns true when all guards pass', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'SCHEDULED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
        patientId: 'patient-1',
        metadata: {},
      });
      expect(engine.canTransition('IDLE', 'LOAD_PATIENT', ctx)).toBe(true);
    });

    it('returns false when any guard fails', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        patientId: 'patient-1',
        metadata: {},
      });
      expect(engine.canTransition('IDLE', 'LOAD_PATIENT', ctx)).toBe(false);
    });
  });

  describe('getFailingGuardIds', () => {
    it('returns empty array when all guards pass', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'SCHEDULED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
        patientId: 'patient-1',
        metadata: {},
      });
      expect(engine.getFailingGuardIds('IDLE', 'LOAD_PATIENT', ctx)).toEqual([]);
    });

    it('returns guard IDs when guards fail', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' },
        patientId: 'patient-1',
        metadata: {},
      });
      const failingIds = engine.getFailingGuardIds('IDLE', 'LOAD_PATIENT', ctx);
      expect(failingIds).toContain('G-001');
      expect(failingIds).toContain('G-002');
    });
  });

  describe('getHighestRiskViolation', () => {
    it('returns null when all guards pass', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'SCHEDULED', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
        patientId: 'patient-1',
        metadata: {},
      });
      expect(engine.getHighestRiskViolation('IDLE', 'LOAD_PATIENT', ctx)).toBeNull();
    });

    it('returns highest risk violation when guards fail', () => {
      const ctx = buildGuardContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 0,
        user: { id: 'nurse-1', role: 'NURSE', name: 'Nurse Joy' },
        patientId: 'patient-1',
        metadata: {},
      });
      const violation = engine.getHighestRiskViolation('IDLE', 'LOAD_PATIENT', ctx);
      expect(violation).not.toBeNull();
      expect(violation!.clinicalRisk).toBe('medium');
    });
  });

  describe('registry', () => {
    it('returns guards for registered transition', () => {
      const guards = registry.getGuards('ACTIVE', 'PAUSE');
      expect(guards.length).toBeGreaterThan(0);
    });

    it('returns empty array for unregistered transition', () => {
      const guards = registry.getGuards('UNKNOWN', 'UNKNOWN');
      expect(guards).toHaveLength(0);
    });

    it('allows custom guard registration', () => {
      const customGuard = () => ({ passed: true });
      registry.register({
        from: 'IDLE',
        action: 'LOAD_PATIENT',
        guard: customGuard,
      });
      const guards = registry.getGuards('IDLE', 'LOAD_PATIENT');
      expect(guards).toContain(customGuard);
    });
  });
});
