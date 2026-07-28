/**
 * Application Layer — Side Effect Registry
 *
 * Maps WorkflowSideEffect types to handler functions.
 * The registry contains no business logic — it only routes work.
 */

import type { IDraftService } from './WorkflowCoordinatorDependencies';
import type { INotificationService } from '@/domain/interfaces/services/INotificationService';
import type { IAuditService } from '@/domain/interfaces/services/IAuditService';
import type { QueueApi } from '@/domain/interfaces/services/QueueApi';
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import type { ITimerService } from './WorkflowCoordinatorDependencies';
import type { WorkflowSideEffect } from '@/domain/workflows/WorkflowSideEffect';

export interface SideEffectHandler {
  readonly type: string;
  readonly priority: number;
  execute(effect: WorkflowSideEffect): Promise<{ success: true } | { success: false; error: unknown }>;
}

export class SideEffectRegistry {
  private readonly handlers = new Map<string, SideEffectHandler>();

  constructor(private readonly deps: {
    readonly draftService: IDraftService;
    readonly patientApi: PatientApi;
    readonly queueApi: QueueApi;
    readonly notificationService: INotificationService;
    readonly auditService: IAuditService;
    readonly timerService: ITimerService;
  }) {}

  register(handler: SideEffectHandler): void {
    this.handlers.set(handler.type, handler);
  }

  get(type: string): SideEffectHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  getAllTypes(): readonly string[] {
    return Array.from(this.handlers.keys());
  }
}

function toSideEffectResult(promise: Promise<unknown>): Promise<{ success: true } | { success: false; error: unknown }> {
  return promise
    .then(() => ({ success: true } as const))
    .catch((error) => ({ success: false, error } as const));
}

export function createSideEffectRegistry(deps: {
  readonly draftService: IDraftService;
  readonly patientApi: PatientApi;
  readonly queueApi: QueueApi;
  readonly notificationService: INotificationService;
  readonly auditService: IAuditService;
  readonly timerService: ITimerService;
}): SideEffectRegistry {
  const registry = new SideEffectRegistry(deps);

  registry.register({
    type: 'SaveDraft',
    priority: 1,
    execute: async (effect) => {
      const saveEffect = effect as any;
      const result = await deps.draftService.saveDraft(
        saveEffect.appointmentId,
        saveEffect.payload.doctorId,
        saveEffect.payload.notes,
        saveEffect.payload.version
      );
      return result.success === true ? { success: true } : { success: false, error: result.error };
    },
  });

  registry.register({
    type: 'RefreshQueue',
    priority: 3,
    execute: async (effect) => {
      const refreshEffect = effect as any;
      const result = await deps.queueApi.loadQueue(refreshEffect.payload.doctorId);
      return result.success === true ? { success: true } : { success: false, error: result.error };
    },
  });

  registry.register({
    type: 'NotifyPatientContext',
    priority: 5,
    execute: async (effect) => {
      const notifyEffect = effect as any;
      await deps.notificationService.sendInApp(
        notifyEffect.payload.patientId,
        'Consultation Context',
        `Patient context updated for appointment ${notifyEffect.payload.appointmentId}`,
        'info',
        notifyEffect.payload.context
      );
      return { success: true };
    },
  });

  registry.register({
    type: 'ScheduleAutosave',
    priority: 6,
    execute: async (effect) => {
      const scheduleEffect = effect as any;
      await deps.timerService.startAutosave(scheduleEffect.payload.appointmentId, scheduleEffect.payload.debounceMs);
      return { success: true };
    },
  });

  registry.register({
    type: 'EmitAuditEvent',
    priority: 2,
    execute: async (effect) => {
      const auditEffect = effect as any;
      await deps.auditService.recordEvent({
        userId: auditEffect.payload.actorId,
        recordId: String(auditEffect.payload.appointmentId),
        action: auditEffect.payload.eventType,
        model: 'Workflow',
        details: JSON.stringify(auditEffect.payload.metadata),
        sessionId: auditEffect.payload.actorId,
      });
      return { success: true };
    },
  });

  registry.register({
    type: 'NotifyBilling',
    priority: 4,
    execute: async (effect) => {
      const billingEffect = effect as any;
      await deps.notificationService.sendInApp(
        billingEffect.payload.appointmentId.toString(),
        'Billing Notification',
        `Billing notification for consultation ${billingEffect.payload.consultationId}`,
        'info',
        billingEffect.payload.billingSummary
      );
      return { success: true };
    },
  });

  registry.register({
    type: 'PublishWorkflowEvent',
    priority: 7,
    execute: async (_effect) => {
      return { success: true };
    },
  });

  registry.register({
    type: 'InvalidateQuery',
    priority: 8,
    execute: async () => {
      return { success: true };
    },
  });

  return registry;
}
