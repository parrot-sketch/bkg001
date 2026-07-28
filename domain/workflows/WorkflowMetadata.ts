/**
 * Workflow Metadata
 *
 * Additional context passed with commands that influences guard evaluation
 * and side effect production.
 */

export interface WorkflowMetadata {
  readonly correlationId: string;
  readonly actorId: string;
  readonly timestamp: number;
  readonly previousState?: string;
  readonly targetAppointmentId?: number;
  readonly userConfirmedSwitch?: boolean;
  readonly userConfirmedUnsaved?: boolean;
  readonly saveTimeoutCleared?: boolean;
  readonly errorType?: string;
  readonly retryCount?: number;
  readonly refetchedNotes?: unknown;
  readonly auditLogged?: boolean;
  readonly cachesInvalidated?: boolean;
  readonly billingSummary?: unknown;
  readonly advisoryWarnings?: readonly { readonly critical: boolean; readonly acknowledged: boolean }[];
  readonly patientDeceased?: boolean;
  readonly pendingMutations?: number;
  readonly dataCorruptionConfirmed?: boolean;
  readonly draftTimestamp?: number;
  readonly serverUpdatedAt?: number;
  readonly draftStructured?: Record<string, unknown>;
  readonly showCompleteDialog?: boolean;
  readonly userInitiated?: boolean;
  readonly custom?: Readonly<Record<string, unknown>>;
}

export function createMetadata(overrides: Partial<WorkflowMetadata> = {}): WorkflowMetadata {
  return {
    correlationId: overrides.correlationId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    actorId: overrides.actorId ?? 'unknown',
    timestamp: overrides.timestamp ?? Date.now(),
    previousState: overrides.previousState,
    targetAppointmentId: overrides.targetAppointmentId,
    userConfirmedSwitch: overrides.userConfirmedSwitch,
    userConfirmedUnsaved: overrides.userConfirmedUnsaved,
    saveTimeoutCleared: overrides.saveTimeoutCleared,
    errorType: overrides.errorType,
    retryCount: overrides.retryCount,
    refetchedNotes: overrides.refetchedNotes,
    auditLogged: overrides.auditLogged,
    cachesInvalidated: overrides.cachesInvalidated,
    billingSummary: overrides.billingSummary,
    advisoryWarnings: overrides.advisoryWarnings,
    patientDeceased: overrides.patientDeceased,
    pendingMutations: overrides.pendingMutations,
    dataCorruptionConfirmed: overrides.dataCorruptionConfirmed,
    draftTimestamp: overrides.draftTimestamp,
    serverUpdatedAt: overrides.serverUpdatedAt,
    draftStructured: overrides.draftStructured,
    showCompleteDialog: overrides.showCompleteDialog,
    userInitiated: overrides.userInitiated,
    custom: overrides.custom,
  };
}
