/**
 * Domain Interface — QueueApi
 *
 * Port (interface) for queue data retrieval used by the Consultation
 * bounded context and adjacent dashboard views.
 *
 * This interface defines the business operations available from the
 * Queue bounded context's external API surface.
 *
 * Implementations live in the Infrastructure layer (e.g., `HttpQueueApi`).
 * Upper layers (Application, Presentation) must depend on this interface,
 * never on a concrete HTTP adapter.
 *
 * **Dependency direction:**
 * - Allowed: Application → QueueApi
 * - Forbidden: QueueApi → Application/Presentation/Infrastructure
 *
 * **Future transport note:**
 * The port remains stable regardless of whether the underlying transport
 * is HTTP polling, WebSockets, Server-Sent Events, or push notifications.
 * Future adapters may extend behavior without changing this interface.
 */

import type {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';

/**
 * Patient entry in a clinician's queue.
 */
export interface QueuePatient {
  readonly id: number;
  readonly patientId: string;
  readonly patient: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fileNumber: string;
  };
  readonly appointmentId: number | null;
  readonly appointmentDate: string | null;
  readonly time: string | null;
  readonly type: string;
  readonly status: string;
  readonly addedAt: string;
  readonly waitTime: string;
  readonly notes: string | null;
  readonly isWalkIn: boolean;
}

/**
 * Successful operation result.
 */
export interface QueueSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed operation result.
 */
export interface QueueFailure {
  readonly success: false;
  readonly error: ClinicalError;
}

/**
 * Discriminated union for all QueueApi outcomes.
 */
export type QueueOutcome<T> = QueueSuccess<T> | QueueFailure;

/**
 * QueueApi — persistence boundary for queue data.
 *
 * Business operations:
 * - Load the clinician's patient queue.
 *
 * Implementations MUST:
 * - Return `QueueFailure` with a `ClinicalError` instead of throwing.
 * - Preserve the request/response contracts of the backend.
 * - Map transport/HTTP failures to `ClinicalErrorCode` values.
 *
 * Implementations MUST NOT:
 * - Expose HTTP details (URLs, status codes, headers) through this interface.
 * - Leak framework types (fetch, Request, Response) to consumers.
 *
 * **Real-time extension point:**
 * Future adapters may implement subscription-based transports without
 * changing this interface. Consumers should treat the returned data as
 * the current authoritative snapshot.
 */
export interface QueueApi {
  /**
   * Load the patient queue for a clinician.
   *
   * Returns patients with status WAITING or IN_CONSULTATION,
   * sorted by addition time (oldest first).
   */
  loadQueue(clinicianId: string): Promise<QueueOutcome<QueuePatient[]>>;
}
