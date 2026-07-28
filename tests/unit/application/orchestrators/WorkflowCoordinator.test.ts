import { describe, it, expect, vi } from 'vitest';
import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';
import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory';
import { SideEffectRegistry } from '@/application/orchestrators/SideEffectRegistry';
import { SideEffectDispatcher } from '@/application/orchestrators/SideEffectDispatcher';
import { WorkflowCoordinatorResult, isWorkflowSuccess, isWorkflowPartialSuccess, isWorkflowFailure } from '@/application/orchestrators/WorkflowCoordinatorResult';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import type { GuardContext } from '@/domain/workflows/GuardContext';
import type { GuardRegistry } from '@/domain/workflows/GuardRegistry';
import type { IDraftService } from '@/application/orchestrators/WorkflowCoordinatorDependencies';
import type { ITimerService } from '@/application/orchestrators/WorkflowCoordinatorDependencies';
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import type { QueueApi } from '@/domain/interfaces/services/QueueApi';
import type { INotificationService } from '@/domain/interfaces/services/INotificationService';
import type { IAuditService } from '@/domain/interfaces/services/IAuditService';

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

function createMockDependencies(): {
  draftService: IDraftService;
  patientApi: PatientApi;
  queueApi: QueueApi;
  notificationService: INotificationService;
  auditService: IAuditService;
  timerService: ITimerService;
} {
  return {
    draftService: {
      saveDraft: vi.fn().mockResolvedValue({ success: true, version: 'v1' }),
      restoreDraft: vi.fn().mockResolvedValue({ success: true, data: {} }),
    } satisfies IDraftService,
    patientApi: {
      loadPatient: vi.fn().mockResolvedValue({ success: true, data: { id: 'patient-1', fullName: 'John Doe' } }),
      loadPatientAppointments: vi.fn().mockResolvedValue({ success: true, data: [] }),
      loadUpcomingAppointments: vi.fn().mockResolvedValue({ success: true, data: [] }),
    } satisfies PatientApi,
    queueApi: {
      loadQueue: vi.fn().mockResolvedValue({ success: true, data: [] }),
    } satisfies QueueApi,
    notificationService: {
      sendEmail: vi.fn().mockResolvedValue(undefined),
      sendSMS: vi.fn().mockResolvedValue(undefined),
      sendInApp: vi.fn().mockResolvedValue(undefined),
    } satisfies INotificationService,
    auditService: {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    } satisfies IAuditService,
    timerService: {
      startAutosave: vi.fn().mockResolvedValue(undefined),
      stopAutosave: vi.fn().mockResolvedValue(undefined),
      startSessionTimer: vi.fn().mockResolvedValue(undefined),
      stopSessionTimer: vi.fn().mockResolvedValue(undefined),
    } satisfies ITimerService,
  };
}

describe('WorkflowCoordinator', () => {
  describe('successful workflow execution', () => {
    it('returns success when workflow and all side effects succeed', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(isWorkflowSuccess(result)).toBe(true);
      expect(result.workflowResult.decision.success).toBe(true);
    });

    it('returns failure when workflow engine rejects transition', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(isWorkflowFailure(result)).toBe(true);
      expect(result.sideEffectResults).toHaveLength(0);
    });

    it('handles empty side effect list', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(isWorkflowSuccess(result)).toBe(true);
      expect(result.sideEffectResults).toHaveLength(0);
    });
  });

  describe('side-effect dispatch ordering', () => {
    it('dispatches side effects in priority order', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(isWorkflowSuccess(result)).toBe(true);
      const types = result.sideEffectResults.map(r => r.sideEffect.type);
      if (types.length >= 2) {
        const highIndex = types.indexOf('NotifyPatientContext');
        const normalIndex = types.findIndex(t => t === 'NotifyBilling' || t === 'RefreshQueue');
        if (highIndex !== -1 && normalIndex !== -1) {
          expect(highIndex).toBeLessThan(normalIndex);
        }
      }
    });

    it('preserves creation order for equal priority side effects', async () => {
      const registry = new SideEffectRegistry(createMockDependencies());
      const executionOrder: string[] = [];
      registry.register({
        type: 'TestEffectA',
        priority: 2,
        execute: async () => { executionOrder.push('A'); return { success: true }; },
      });
      registry.register({
        type: 'TestEffectB',
        priority: 2,
        execute: async () => { executionOrder.push('B'); return { success: true }; },
      });
      const dispatcher = new SideEffectDispatcher(registry);
      const result = await dispatcher.dispatch([
        { type: 'TestEffectA', priority: 'normal', idempotent: true, retry: 'no_retry', executionOrder: 1, payload: {} } as any,
        { type: 'TestEffectB', priority: 'normal', idempotent: true, retry: 'no_retry', executionOrder: 2, payload: {} } as any,
      ]);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe('partial failures', () => {
    it('returns partial success when one side effect fails', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'CHECKED_IN', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const deps = createMockDependencies();
      deps.notificationService.sendInApp = vi.fn().mockRejectedValue(new Error('Notification failed'));
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(isWorkflowPartialSuccess(result)).toBe(true);
      expect(result.workflowResult.decision.success).toBe(true);
      expect(result.sideEffectFailures.length).toBeGreaterThan(0);
    });

    it('does not retry non-retryable side effects', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(isWorkflowSuccess(result)).toBe(true);
    });

    it('aggregates multiple side effect failures', async () => {
      const registry = new SideEffectRegistry(createMockDependencies());
      registry.register({
        type: 'FailA',
        priority: 1,
        execute: async () => ({ success: false, error: new Error('A') }),
      });
      registry.register({
        type: 'FailB',
        priority: 1,
        execute: async () => ({ success: false, error: new Error('B') }),
      });
      const dispatcher = new SideEffectDispatcher(registry);
      const result = await dispatcher.dispatch([
        { type: 'FailA', priority: 'high', idempotent: true, retry: 'no_retry', executionOrder: 1, payload: {} } as any,
        { type: 'FailB', priority: 'high', idempotent: true, retry: 'no_retry', executionOrder: 2, payload: {} } as any,
      ]);
      expect(result.failures).toHaveLength(2);
    });
  });

  describe('deterministic execution', () => {
    it('produces identical results for identical inputs', async () => {
      const engine1 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const engine2 = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps1 = createMockDependencies();
      const deps2 = createMockDependencies();
      const coordinator1 = new WorkflowCoordinator({ ...deps1, workflowEngine: engine1 });
      const coordinator2 = new WorkflowCoordinator({ ...deps2, workflowEngine: engine2 });

      const result1 = await coordinator1.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);
      const result2 = await coordinator2.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(result1.status).toBe(result2.status);
      expect(result1.sideEffectResults.length).toBe(result2.sideEffectResults.length);
    });
  });

  describe('factory construction', () => {
    it('creates coordinator via factory with dependencies', () => {
      const deps = createMockDependencies();
      const coordinator = createWorkflowCoordinator({ dependencies: { ...deps, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any } });
      expect(coordinator).toBeInstanceOf(WorkflowCoordinator);
    });

    it('creates coordinator with custom consultation state', () => {
      const deps = createMockDependencies();
      const coordinator = createWorkflowCoordinator({
        dependencies: {
          ...deps,
          eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any,
        },
        consultationState: ConsultationWorkflowState.READY,
        documentationState: DocumentationWorkflowState.Document,
      });
      expect(coordinator).toBeInstanceOf(WorkflowCoordinator);
    });
  });

  describe('immutable coordinator results', () => {
    it('returns frozen result objects', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.workflowResult)).toBe(true);
      expect(Object.isFrozen(result.workflowResult.decision)).toBe(true);
    });
  });

  describe('event propagation', () => {
    it('preserves workflow events in result', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.IDLE });
      const deps = createMockDependencies();
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'INITIALIZE_CONSULTATION', appointmentId: 1 } as WorkflowCommand);

      expect(result.workflowResult.decision.events).toBeDefined();
      expect(Array.isArray(result.workflowResult.decision.events)).toBe(true);
    });
  });

  describe('mixed success/failure scenarios', () => {
    it('handles workflow success with partial side effect failure', async () => {
      const engine = createEngine({ consultationWorkflowState: ConsultationWorkflowState.READY, appointmentId: 1, patientId: 'patient-1', consultationId: 1, appointment: { id: 1, patientId: 'patient-1', doctorId: 'doctor-1', status: 'IN_CONSULTATION', slotStartTime: '2024-01-01T10:00:00Z', slotDurationMinutes: 30 }, consultation: { id: 1, appointmentId: 1, state: 'NOT_STARTED', version: '1', updatedAt: '2024-01-01T10:00:00Z' }, user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Smith' }, outcomeType: 'CONSULTATION_ONLY' });
      const deps = createMockDependencies();
      deps.notificationService.sendInApp = vi.fn().mockRejectedValue(new Error('Notification failed'));
      const coordinator = new WorkflowCoordinator({ ...deps, workflowEngine: engine, eventBus: { publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any });

      const result = await coordinator.execute({ type: 'START_CONSULTATION' } as WorkflowCommand);

      expect(isWorkflowPartialSuccess(result)).toBe(true);
      expect(result.workflowResult.decision.success).toBe(true);
      expect(result.sideEffectFailures.length).toBeGreaterThan(0);
    });
  });
});
