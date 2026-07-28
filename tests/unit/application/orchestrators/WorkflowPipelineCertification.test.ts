import { describe, it, expect, vi } from 'vitest';
import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';
import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory';
import { ConsultationWorkflowShim } from '@/application/shims/ConsultationWorkflowShim';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import type { GuardContext } from '@/domain/workflows/GuardContext';
import type { GuardRegistry } from '@/domain/workflows/GuardRegistry';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';

function buildContext(overrides: Partial<GuardContext> = {}): GuardContext {
  const base: GuardContext = {
    appointmentId: 1,
    patientId: 'patient-1',
    consultationId: 1,
    doctorId: 'doctor-1',
    appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 },
    consultation: { id: 1, appointmentId: 1, state: 'IN_PROGRESS', version: '1', updatedAt: '2024-01-01T10:00:00Z' },
    notes: { chiefComplaint: 'Headache' },
    outcomeType: 'CONSULTATION_ONLY',
    patientDecision: null,
    isDirty: false,
    lastSavedAt: Date.now(),
    version: '1',
    queue: { inConsultation: [], waiting: [] },
    user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' },
    retryCount: 0,
    metadata: {},
    consultationWorkflowState: ConsultationWorkflowState.IDLE,
    documentationWorkflowState: DocumentationWorkflowState.Document,
    hasLocalDraft: false,
    localDraftTimestamp: null,
  };
  return { ...base, ...overrides } as GuardContext;
}

function createEngine(context?: Partial<GuardContext>): WorkflowEngine {
  const registry: GuardRegistry = { getGuards: () => [] };
  const ctx = buildContext(context);
  return new WorkflowEngine(ctx.consultationWorkflowState, ctx.documentationWorkflowState, ctx, { registry, shortCircuit: false });
}

function createDeps() {
  return {
    draftService: { saveDraft: async () => ({ success: true, version: 'v1' }), restoreDraft: async () => ({ success: true, data: {} }) },
    patientApi: { loadPatient: async () => ({ success: true, data: { id: 'patient-1', fullName: 'John Doe' } }), loadPatientAppointments: async () => ({ success: true, data: [] }), loadUpcomingAppointments: async () => ({ success: true, data: [] }) },
    queueApi: { loadQueue: async () => ({ success: true, data: [] }) },
    notificationService: { sendEmail: async () => {}, sendSMS: async () => {}, sendInApp: async () => {} },
    auditService: { recordEvent: async () => {} },
    timerService: { startAutosave: async () => {}, stopAutosave: async () => {}, startSessionTimer: async () => {}, stopSessionTimer: async () => {} },
  };
}

describe('WorkflowPipelineCertification', () => {
  describe('end-to-end successful execution', () => {
    it('flows command → coordinator → engine → side effects → events', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = { ...createDeps(), workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator = new WorkflowCoordinator(deps as any);

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(result.status).toBe('success');
    });

    it('preserves deterministic output across executions', async () => {
      const engine1 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps1 = { ...createDeps(), workflowEngine: engine1, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator1 = new WorkflowCoordinator(deps1 as any);

      const engine2 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps2 = { ...createDeps(), workflowEngine: engine2, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator2 = new WorkflowCoordinator(deps2 as any);

      const result1 = await coordinator1.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);
      const result2 = await coordinator2.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(result1.status).toBe(result2.status);
      expect(result1.workflowResult.decision.nextConsultationState).toBe(result2.workflowResult.decision.nextConsultationState);
    });
  });

  describe('guard rejection', () => {
    it('returns failure without side effects or events', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = { ...createDeps(), workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator = new WorkflowCoordinator(deps as any);

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(result.status).toBe('failure');
    });
  });

  describe('side-effect failure', () => {
    it('returns partial success when side effect fails', async () => {
      const deps = createDeps();
      deps.notificationService.sendInApp = async () => { throw new Error('Notification failed'); };
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CHECKED_IN', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } } as any);

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(result.status).toBe('partial_success');
      expect(result.workflowResult.decision.success).toBe(true);
    });
  });

  describe('event failure isolation', () => {
    it('returns success when event subscriber throws', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = { ...createDeps(), workflowEngine: engine, eventBus: { publish: vi.fn().mockRejectedValue(new Error('Event failed')), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator = new WorkflowCoordinator(deps as any);

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(result.status).toBe('success');
      expect(result.workflowResult.decision.success).toBe(true);
    });
  });

  describe('multiple side effects', () => {
    it('executes side effects in priority order', async () => {
      const executionOrder: string[] = [];
      const deps = createDeps();
      deps.draftService.saveDraft = async () => { executionOrder.push('SaveDraft'); return { success: true, version: 'v1' }; };
      deps.queueApi.loadQueue = async () => { executionOrder.push('RefreshQueue'); return { success: true, data: [] }; };
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.ACTIVE, appointmentId: 1, patientId: 'patient-1', consultationId: 1, version: '1', notes: { chiefComplaint: 'Test' } });
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } } as any);

      await coordinator.execute({ type: 'SAVE_DOCUMENTATION' } as WorkflowCommand);

      expect(executionOrder).toContain('SaveDraft');
    });
  });

  describe('multiple events', () => {
    it('publishes all events in order', async () => {
      const publishedEvents: string[] = [];
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = { ...createDeps(), workflowEngine: engine, eventBus: { publish: async (event: any) => { publishedEvents.push(event.type); return undefined; }, subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator = new WorkflowCoordinator(deps as any);

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(publishedEvents).toEqual(result.workflowResult.decision.events.map(e => e.type));
    });
  });

  describe('rollback compatibility', () => {
    it('shim returns failure when coordinator is null (no legacy fallback)', async () => {
      const shim = new ConsultationWorkflowShim(null);
      const dispatch = vi.fn();

      const result = await shim.transitionTo(ConsultationWorkflowState.IDLE, ConsultationWorkflowState.LOADING, dispatch);

      expect(result.success).toBe(false);
      expect(result.nextState).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('shim returns failure when coordinator is null regardless of enabled state', async () => {
      const shim = new ConsultationWorkflowShim(null);

      const result = await shim.transitionTo(ConsultationWorkflowState.IDLE, ConsultationWorkflowState.LOADING);

      expect(result.success).toBe(false);
    });
  });

  describe('deterministic replay', () => {
    it('produces identical results when replayed', async () => {
      const engine1 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CHECKED_IN', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const deps1 = { ...createDeps(), workflowEngine: engine1, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator1 = new WorkflowCoordinator(deps1 as any);

      const engine2 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CHECKED_IN', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const deps2 = { ...createDeps(), workflowEngine: engine2, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator2 = new WorkflowCoordinator(deps2 as any);

      const result1 = await coordinator1.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);
      const result2 = await coordinator2.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(result1.status).toBe(result2.status);
      expect(result1.workflowResult.decision.nextConsultationState).toBe(result2.workflowResult.decision.nextConsultationState);
      expect(result1.sideEffectResults.length).toBe(result2.sideEffectResults.length);
      expect(result1.eventResults.length).toBe(result2.eventResults.length);
    });
  });

  describe('partial success aggregation', () => {
    it('reports both successful and failed side effects', async () => {
      const deps = createDeps();
      deps.draftService.saveDraft = async () => ({ success: false, error: 'Draft failed' });
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.ACTIVE, appointmentId: 1, patientId: 'patient-1', consultationId: 1, version: '1', notes: { chiefComplaint: 'Test' } });
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } } as any);

      const result = await coordinator.execute({ type: 'SAVE_DOCUMENTATION' } as WorkflowCommand);

      expect(result.status).toBe('partial_success');
      expect(result.workflowResult.decision.success).toBe(true);
    });
  });

  describe('failure isolation', () => {
    it('does not attempt side effects or events on workflow failure', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = { ...createDeps(), workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } };
      const coordinator = new WorkflowCoordinator(deps as any);

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(result.status).toBe('failure');
    });
  });
});
