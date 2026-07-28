/**
 * Shared Kernel — Query Configuration
 *
 * Canonical query key factories and cache policies for the Consultation Module.
 *
 * **Stability contract:**
 * - Key factories MUST match query keys already used by existing hooks.
 * - Cache policies reflect current runtime behavior; they are not aspirational.
 * - This module is additive only — no consumer behavior changes until future
 *   tasks explicitly adopt these factories.
 *
 * **Discovery basis:** Audited `contexts/ConsultationContext.tsx`,
 * `hooks/consultation/*`, `hooks/doctor/*`, and `hooks/consultations/*`.
 */

// ============================================================
// Query Key Factories
// ============================================================

/**
 * Active consultation session keys.
 *
 * Used by:
 * - `useConsultation`
 * - `useSaveConsultationDraft`
 * - `ConsultationContext` optimistic updates / invalidations
 */
export const consultationKeys = {
  all: ['consultation'] as const,
  detail: (appointmentId: number | string) => ['consultation', appointmentId] as const,
} as const;

/**
 * Consultation request list keys (frontdesk-oriented).
 *
 * Used by:
 * - `useConsultations`
 * - `usePendingConsultations`
 */
export const consultationsKeys = {
  all: ['consultations'] as const,
  pending: () => ['consultations', 'pending'] as const,
  byStatus: (statuses: string[]) => ['consultations', 'status', statuses.join(',')] as const,
} as const;

/**
 * Patient consultation history keys.
 *
 * Used by:
 * - `usePatientConsultationHistory`
 */
export const patientHistoryKeys = {
  byPatientId: (patientId: string) => ['patient-consultations', patientId] as const,
} as const;

/**
 * Doctor queue keys.
 *
 * Used by:
 * - `useDoctorQueue`
 * - `ConsultationContext` refetchQueue
 */
export const doctorQueueKeys = {
  byDoctorId: (doctorId: string) => ['doctor', doctorId, 'queue'] as const,
} as const;

// ============================================================
// Cache Policies
// ============================================================

/**
 * Cache policy shape.
 *
 * Upper layers (Application/Presentation) map these values directly
 * into React Query `useQuery` / `useMutation` options.
 */
export interface CachePolicy {
  readonly staleTime: number;
  readonly gcTime: number;
  readonly retry: number;
  readonly retryDelay: (attemptIndex: number) => number;
  readonly refetchOnWindowFocus: boolean;
  readonly refetchOnReconnect: boolean;
  readonly refetchOnMount: boolean;
  readonly refetchInterval?: number | false;
  readonly networkMode?: 'online' | 'offlineFirst';
}

/**
 * Default policy for consultation data.
 *
 * Rationale:
 * - Consultation data is critical and frequently mutated by auto-save.
 * - staleTime 0 ensures the UI always reflects the latest authoritative state.
 * - 3 retries with exponential backoff tolerate transient API hiccups.
 * - refetchOnWindowFocus false prevents redundant refetches when the user
 *   returns to the tab; auto-save keeps the cache current.
 */
export const policyConsultation: CachePolicy = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

/**
 * Default policy for consultation lists and status queries.
 *
 * Rationale:
 * - Lists change less frequently than active session data.
 * - 5-minute staleTime reduces unnecessary API calls.
 * - 10-minute gcTime keeps completed-session caches available for back-navigation.
 */
export const policyConsultations: CachePolicy = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

/**
 * Default policy for patient consultation history.
 *
 * Rationale:
 * - Historical data changes infrequently during a session.
 * - 5-minute staleTime balances freshness with performance.
 */
export const policyPatientHistory: CachePolicy = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

/**
 * Default policy for doctor queue.
 *
 * Rationale:
 * - Queue is operational data that changes as patients are called.
 * - 30-second staleTime reflects moderate churn.
 * - 60-second refetchInterval provides low-latency updates without overwhelming
 *   the database (reduced from original 30s to conserve connections).
 * - offlineFirst supports intermittent connectivity in clinic environments.
 */
export const policyDoctorQueue: CachePolicy = {
  staleTime: 30_000,
  gcTime: 2 * 60 * 1000,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  refetchInterval: 60_000,
  networkMode: 'offlineFirst',
};

/**
 * Fallback policy for any consultation-related query not explicitly covered.
 */
export const policyDefault: CachePolicy = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
};

// ============================================================
// Invalidation Strategy Reference
// ============================================================

/**
 * Documents when queries SHOULD be invalidated.
 *
 * This is a reference only — the actual invalidation logic lives in
 * hooks and use cases. Future tasks MUST consult this map before adding
 * new invalidateQueries calls.
 */
export const invalidationTriggers = {
  /**
   * Triggered when a consultation is successfully started.
   * Invalidates doctor appointment lists so the queue reflects the new status.
   */
  consultationStarted: [
    doctorQueueKeys.byDoctorId,
    ['appointments'],
    ['doctor'],
  ] as const,

  /**
   * Triggered when a consultation is completed.
   * Invalidates the completed session cache plus all downstream operational data.
   */
  consultationCompleted: [
    consultationKeys.detail,
    consultationKeys.all,
    ['doctor'],
    ['appointments'],
    ['billing'],
    ['appointment-billing'],
  ] as const,

  /**
   * Triggered when notes are saved (draft or final).
   * Targets the specific consultation cache entry only.
   */
  notesSaved: [consultationKeys.detail] as const,
} as const;

// ============================================================
// Polling Policy Reference
// ============================================================

/**
 * Documents polling behavior for consultation-adjacent data.
 *
 * Notes:
 * - Active consultation polling via `refetchInterval` is currently DISABLED
 *   because version-token resets caused conflicts.
 * - The ConsultationContext heartbeat runs outside React Query (raw `fetch`
 *   every 30s) and is therefore not represented here.
 */
export const pollingPolicy = {
  doctorQueue: {
    intervalMs: 60_000,
    owner: 'useDoctorQueue',
  },
  consultation: {
    intervalMs: false, // DISABLED — see useConsultation.ts comments
    owner: 'useConsultation',
  },
} as const;
