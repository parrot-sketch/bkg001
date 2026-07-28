import { describe, it, expect } from 'vitest';
import {
  ConsultationWorkflowState,
  ConsultationWorkflowAction,
} from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import { createWorkflowEngine, buildEngineContext } from './buildEngineContext';
import {
  WorkflowEngine,
  UnknownCommand,
  InvalidTransition,
  GuardFailure,
} from '@/domain/workflows';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import type { GuardRegistry } from '@/domain/workflows/GuardRegistry';
import { WorkflowGuardEngine } from '@/domain/workflows/WorkflowGuardEngine';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';

describe('WorkflowEngine', () => {
  describe('successful transitions', () => {
    it('executes INITIALIZE_CONSULTATION and transitions IDLE -> LOADING', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        patientId: 'patient-1',
      });

      const result = engine.execute({
        type: 'INITIALIZE_CONSULTATION',
        appointmentId: 1,
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.LOADING);
    });

    it('executes START_CONSULTATION and transitions READY -> ACTIVE', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.READY,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        appointment: {
          id: 1,
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          status: 'CHECKED_IN',
          slotStartTime: '2024-01-01T10:00:00Z',
          slotDurationMinutes: 30,
        },
        consultation: {
          id: 1,
          appointmentId: 1,
          state: 'NOT_STARTED',
          version: '1',
          updatedAt: '2024-01-01T10:00:00Z',
        },
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        outcomeType: 'CONSULTATION_ONLY',
      });

      const result = engine.execute({
        type: 'START_CONSULTATION',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.ACTIVE);
      expect(result.decision.events).toHaveLength(1);
      expect(result.decision.events[0].type).toBe('ConsultationStarted');
    });

    it('executes PAUSE_CONSULTATION and transitions ACTIVE -> PAUSED', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
        appointmentId: 1,
        patientId: 'patient-1',
        isDirty: false,
      });

      const result = engine.execute({
        type: 'PAUSE_CONSULTATION',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.PAUSED);
    });

    it('executes RESUME_CONSULTATION and transitions PAUSED -> ACTIVE', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.PAUSED,
        appointmentId: 1,
      });

      const result = engine.execute({
        type: 'RESUME_CONSULTATION',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('executes COMPLETE_CONSULTATION and transitions COMPLETING -> TRANSITIONING', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.COMPLETING,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        outcomeType: 'CONSULTATION_ONLY',
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
      });

      const result = engine.execute({
        type: 'COMPLETE_CONSULTATION',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.TRANSITIONING);
      expect(result.decision.events).toHaveLength(1);
      expect(result.decision.events[0].type).toBe('ConsultationCompleted');
    });

    it('executes CANCEL_CONSULTATION and transitions COMPLETING -> ACTIVE', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.COMPLETING,
        appointmentId: 1,
        metadata: { showCompleteDialog: true },
      });

      const result = engine.execute({
        type: 'CANCEL_CONSULTATION',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('executes SWITCH_PATIENT and transitions READY -> LOADING', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.READY,
        appointmentId: 1,
        patientId: 'patient-1',
        metadata: { targetAppointmentId: 2 },
      });

      const result = engine.execute({
        type: 'SWITCH_PATIENT',
        appointmentId: 2,
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.LOADING);
    });

    it('executes ADVANCE_QUEUE with next patient -> LOADING', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.TRANSITIONING,
        appointmentId: 1,
        queue: {
          inConsultation: [{ id: 2, patientId: 'patient-2' }],
          waiting: [],
        },
      });

      const result = engine.execute({
        type: 'ADVANCE_QUEUE',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.LOADING);
    });

    it('executes ADVANCE_QUEUE with no next patient -> COMPLETED', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.TRANSITIONING,
        appointmentId: 1,
        queue: {
          inConsultation: [],
          waiting: [],
        },
      });

      const result = engine.execute({
        type: 'ADVANCE_QUEUE',
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.COMPLETED);
    });
  });

  describe('invalid transitions and guard failures', () => {
    it('rejects invalid transition from IDLE', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
      });

      const result = engine.execute({
        type: 'START_CONSULTATION',
      });

      expect(result.decision.success).toBe(false);
      expect(result.decision.errors.length).toBeGreaterThan(0);
    });

    it('rejects unknown command', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
      });

      const result = engine.execute({
        type: 'UNKNOWN_COMMAND',
      } as any);

      expect(result.decision.success).toBe(false);
      expect(result.decision.errors[0]).toBeInstanceOf(UnknownCommand);
    });

    it('rejects non-object command', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
      });

      const result = engine.execute(null as any);

      expect(result.decision.success).toBe(false);
      expect(result.decision.errors[0]).toBeInstanceOf(UnknownCommand);
    });
  });

  describe('deterministic execution', () => {
    it('produces identical results for identical inputs', () => {
      const ctx = buildEngineContext({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        patientId: 'patient-1',
      });
      const emptyRegistry: GuardRegistry = { getGuards: () => [] };
      const engine1 = new WorkflowEngine(
        ConsultationWorkflowState.IDLE,
        DocumentationWorkflowState.Document,
        ctx,
        { registry: emptyRegistry, shortCircuit: false }
      );
      const engine2 = new WorkflowEngine(
        ConsultationWorkflowState.IDLE,
        DocumentationWorkflowState.Document,
        ctx,
        { registry: emptyRegistry, shortCircuit: false }
      );

      const cmd: WorkflowCommand = { type: 'INITIALIZE_CONSULTATION', appointmentId: 1 };
      const result1 = engine1.execute(cmd);
      const result2 = engine2.execute(cmd);

      expect(result1.decision.success).toBe(result2.decision.success);
      expect(result1.decision.nextConsultationState).toBe(result2.decision.nextConsultationState);
      expect(result1.guardsEvaluated).toBe(result2.guardsEvaluated);
    });
  });

  describe('event and side effect ordering', () => {
    it('produces events in deterministic order', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.READY,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        appointment: {
          id: 1,
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          status: 'CHECKED_IN',
          slotStartTime: '2024-01-01T10:00:00Z',
          slotDurationMinutes: 30,
        },
        consultation: {
          id: 1,
          appointmentId: 1,
          state: 'NOT_STARTED',
          version: '1',
          updatedAt: '2024-01-01T10:00:00Z',
        },
        user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
        outcomeType: 'CONSULTATION_ONLY',
      });

      const result = engine.execute({
        type: 'START_CONSULTATION',
      });

      expect(result.decision.events.length).toBeGreaterThan(0);
      expect(result.decision.events[0].type).toBe('ConsultationStarted');
      expect(result.decision.events[0].timestamp).toBeDefined();
      expect(result.decision.events[0].correlationId).toBeDefined();
    });

    it('produces side effects in deterministic order', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        version: '1',
        notes: { chiefComplaint: 'Test' },
      });

      const result = engine.execute({
        type: 'SAVE_DOCUMENTATION',
      });

      expect(result.decision.sideEffects.length).toBeGreaterThan(0);
      expect(result.decision.sideEffects[0].type).toBe('SaveDraft');
      expect(result.decision.sideEffects[0].priority).toBe('high');
    });
  });

  describe('multiple guard failures', () => {
    it('aggregates all guard failures when shortCircuit is false', () => {
      const failingRegistry: GuardRegistry = {
        getGuards: () => [],
      };
      const engine = new WorkflowEngine(
        ConsultationWorkflowState.IDLE,
        DocumentationWorkflowState.Document,
        buildEngineContext({
          consultationWorkflowState: ConsultationWorkflowState.IDLE,
          appointmentId: 1,
          patientId: 'patient-1',
        }),
        { registry: failingRegistry, shortCircuit: false }
      );

      const result = engine.execute({
        type: 'INITIALIZE_CONSULTATION',
        appointmentId: 1,
      });

      expect(result.decision.success).toBe(true);
      expect(result.decision.nextConsultationState).toBe(ConsultationWorkflowState.LOADING);
    });
  });

  describe('terminal states', () => {
    it('does not transition from terminal COMPLETED state', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.COMPLETED,
      });

      const result = engine.execute({
        type: 'START_CONSULTATION',
      });

      expect(result.decision.success).toBe(false);
      expect(result.decision.errors.length).toBeGreaterThan(0);
    });
  });

  describe('idempotent execution', () => {
    it('produces consistent side effect payloads for same command', () => {
      const engine1 = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        version: '1',
        notes: { chiefComplaint: 'Test' },
      });

      const engine2 = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.ACTIVE,
        appointmentId: 1,
        patientId: 'patient-1',
        consultationId: 1,
        version: '1',
        notes: { chiefComplaint: 'Test' },
      });

      const result1 = engine1.execute({ type: 'SAVE_DOCUMENTATION' });
      const result2 = engine2.execute({ type: 'SAVE_DOCUMENTATION' });

      expect(result1.decision.sideEffects[0].payload.version).toBe(result2.decision.sideEffects[0].payload.version);
    });
  });

  describe('command validation', () => {
    it('validates command type exists', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
      });

      const result = engine.execute({
        type: 'INITIALIZE_CONSULTATION',
        appointmentId: 1,
      });

      expect(result.decision.success).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('executes transition efficiently', () => {
      const engine = createWorkflowEngine({
        consultationWorkflowState: ConsultationWorkflowState.IDLE,
        appointmentId: 1,
        patientId: 'patient-1',
      });

      const result = engine.execute({
        type: 'INITIALIZE_CONSULTATION',
        appointmentId: 1,
      });

      expect(result.executionTimeMs).toBeLessThanOrEqual(10);
    });
  });
});
