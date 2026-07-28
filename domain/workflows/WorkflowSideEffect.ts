/**
 * Workflow Side Effects
 *
 * Describes work to be performed by higher layers.
 * The engine never executes side effects; it only describes them.
 */

export type SideEffectPriority = 'critical' | 'high' | 'normal' | 'low';
export type RetryRecommendation = 'retry' | 'no_retry' | 'exponential_backoff';

export interface BaseSideEffect {
  readonly type: string;
  readonly priority: SideEffectPriority;
  readonly idempotent: boolean;
  readonly retry: RetryRecommendation;
  readonly executionOrder: number;
}

export interface SaveDraftSideEffect extends BaseSideEffect {
  readonly type: 'SaveDraft';
  readonly appointmentId: number;
  readonly consultationId: number;
  readonly payload: {
    readonly doctorId: string;
    readonly notes: unknown;
    readonly version: string;
  };
}

export interface EmitAuditEventSideEffect extends BaseSideEffect {
  readonly type: 'EmitAuditEvent';
  readonly payload: {
    readonly eventType: string;
    readonly actorId: string;
    readonly appointmentId: number;
    readonly patientId: string;
    readonly metadata: Record<string, unknown>;
  };
}

export interface RefreshQueueSideEffect extends BaseSideEffect {
  readonly type: 'RefreshQueue';
  readonly payload: {
    readonly doctorId: string;
  };
}

export interface NotifyBillingSideEffect extends BaseSideEffect {
  readonly type: 'NotifyBilling';
  readonly payload: {
    readonly appointmentId: number;
    readonly consultationId: number;
    readonly outcomeType: string;
    readonly billingSummary: unknown;
  };
}

export interface NotifyPatientContextSideEffect extends BaseSideEffect {
  readonly type: 'NotifyPatientContext';
  readonly payload: {
    readonly patientId: string;
    readonly appointmentId: number;
    readonly context: unknown;
  };
}

export interface ScheduleAutosaveSideEffect extends BaseSideEffect {
  readonly type: 'ScheduleAutosave';
  readonly payload: {
    readonly appointmentId: number;
    readonly debounceMs: number;
  };
}

export interface PublishWorkflowEventSideEffect extends BaseSideEffect {
  readonly type: 'PublishWorkflowEvent';
  readonly payload: {
    readonly eventType: string;
    readonly eventPayload: unknown;
    readonly webSocket: boolean;
  };
}

export interface InvalidateQuerySideEffect extends BaseSideEffect {
  readonly type: 'InvalidateQuery';
  readonly payload: {
    readonly queryKey: readonly string[];
  };
}

export type WorkflowSideEffect =
  | SaveDraftSideEffect
  | EmitAuditEventSideEffect
  | RefreshQueueSideEffect
  | NotifyBillingSideEffect
  | NotifyPatientContextSideEffect
  | ScheduleAutosaveSideEffect
  | PublishWorkflowEventSideEffect
  | InvalidateQuerySideEffect;

export const SIDE_EFFECT_ORDER: Record<WorkflowSideEffect['type'], number> = {
  SaveDraft: 1,
  EmitAuditEvent: 2,
  RefreshQueue: 3,
  NotifyBilling: 4,
  NotifyPatientContext: 5,
  ScheduleAutosave: 6,
  PublishWorkflowEvent: 7,
  InvalidateQuery: 8,
};
