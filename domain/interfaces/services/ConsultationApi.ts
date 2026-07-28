/**
 * Domain Interface — ConsultationApi
 *
 * Port (interface) for consultation data retrieval and persistence.
 *
 * This interface defines the business operations available from the
 * Consultation bounded context's external API surface.
 *
 * Implementations live in the Infrastructure layer (e.g., `HttpConsultationApi`).
 * Upper layers (Application, Presentation) must depend on this interface,
 * never on a concrete HTTP adapter.
 *
 * **Dependency direction:**
 * - Allowed: Application → ConsultationApi
 * - Forbidden: ConsultationApi → Application/Presentation/Infrastructure
 */

import type {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';

/**
 * Successful operation result.
 */
export interface ConsultationSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed operation result.
 */
export interface ConsultationFailure {
  readonly success: false;
  readonly error: ClinicalError;
}

/**
 * Discriminated union for all ConsultationApi outcomes.
 */
export type ConsultationOutcome<T> = ConsultationSuccess<T> | ConsultationFailure;

export interface ConsultationResponse {
  readonly id: number;
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId?: string;
  readonly state: ConsultationState;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly durationMinutes?: number;
  readonly notes?: {
    readonly fullText: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly followUp?: {
    readonly date?: Date;
    readonly type?: string;
    readonly notes?: string;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly photoCount?: number;
  readonly hasMarketingConsentPhotos?: boolean;
  readonly hasCasePlan?: boolean;
  readonly casePlanId?: number;
}

export interface SaveConsultationDraftParams {
  readonly doctorId: string;
  readonly notes: {
    readonly rawText?: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly versionToken?: string;
}

export interface PatientConsultationHistory {
  readonly patientId: string;
  readonly totalCount: number;
  readonly consultations: PatientConsultationHistoryItem[];
  readonly summary: {
    readonly total: number;
    readonly completed: number;
    readonly proceduresRecommended: number;
    readonly proceduresProceeded: number;
    readonly totalPhotos: number;
  };
}

export interface PatientConsultationHistoryItem {
  readonly id: number;
  readonly appointmentId: number;
  readonly appointmentDate: Date;
  readonly appointmentTime: string;
  readonly doctor: {
    readonly id: string;
    readonly name: string;
    readonly specialization: string;
  };
  readonly state: ConsultationState;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly durationMinutes?: number;
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly notesSummary?: string;
  readonly photoCount: number;
  readonly hasBeforePhotos: boolean;
  readonly hasAfterPhotos: boolean;
  readonly hasCasePlan: boolean;
  readonly casePlanId?: number;
  readonly patientProceeded: boolean;
}

/**
 * ConsultationApi — persistence boundary for consultation data.
 *
 * Business operations:
 * - Load the active consultation for an appointment.
 * - Save draft consultation notes with version safety.
 * - Load historical consultations for a patient.
 *
 * Implementations MUST:
 * - Return `ConsultationFailure` with a `ClinicalError` instead of throwing.
 * - Preserve the request/response contracts of the backend.
 * - Map transport/HTTP failures to `ClinicalErrorCode` values.
 *
 * Implementations MUST NOT:
 * - Expose HTTP details (URLs, status codes, headers) through this interface.
 * - Leak framework types (fetch, Request, Response) to consumers.
 */
export interface ConsultationApi {
  /**
   * Load the consultation record for an appointment.
   *
   * Returns `null` data when no consultation has been started yet.
   */
  loadConsultation(appointmentId: number): Promise<ConsultationOutcome<ConsultationResponse | null>>;

  /**
   * Persist draft consultation notes.
   *
   * The draft contains structured notes, optional outcome/decision,
   * and an optional version token for optimistic locking.
   */
  saveConsultationDraft(
    appointmentId: number,
    dto: SaveConsultationDraftParams
  ): Promise<ConsultationOutcome<ConsultationResponse>>;

  /**
   * Send heartbeat signal for an active consultation.
   */
  sendHeartbeat(consultationId: number): Promise<ConsultationOutcome<void>>;

  /**
   * Load past consultations for a patient timeline.
   */
  loadPatientConsultationHistory(patientId: string): Promise<ConsultationOutcome<PatientConsultationHistory>>;
}
