/**
 * DTO: PatientConsultationHistoryDto
 * 
 * Data Transfer Object for patient consultation history.
 * 
 * Designed for aesthetic surgery workflows with emphasis on:
 * - Timeline-based UI (chronological display)
 * - Fast doctor scanning (key decisions visible)
 * - Photo tracking (before/after progression)
 * - Decision status (proceeded, declined, undecided)
 * 
 * This DTO represents consultation history for a patient, optimized for
 * quick review during new consultations.
 */

import { ConsultationState } from '../../domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../domain/enums/PatientDecision';

export interface PatientConsultationHistoryItemDto {
  /**
   * Consultation ID
   */
  readonly id: number;

  /**
   * Associated appointment ID
   */
  readonly appointmentId: number;

  /**
   * Appointment date (for timeline display)
   */
  readonly appointmentDate: Date;

  /**
   * Appointment time
   */
  readonly appointmentTime: string;

  /**
   * Doctor information
   */
  readonly doctor: {
    readonly id: string;
    readonly name: string;
    readonly specialization: string;
  };

  /**
   * Consultation state
   */
  readonly state: ConsultationState;

  /**
   * When consultation was started
   */
  readonly startedAt?: Date;

  /**
   * When consultation was completed
   */
  readonly completedAt?: Date;

  /**
   * Duration in minutes (if completed)
   */
  readonly durationMinutes?: number;

  /**
   * Consultation outcome (if completed)
   * Critical for understanding patient journey
   */
  readonly outcomeType?: ConsultationOutcomeType;

  /**
   * Patient decision (if procedure recommended)
   * YES: Patient proceeded → Case plan created
   * NO: Patient declined
   * PENDING: Patient deciding
   */
  readonly patientDecision?: PatientDecision;

  /**
   * Brief summary of consultation notes
   * First 200 characters for quick scanning
   */
  readonly notesSummary?: string;

  /**
   * Aesthetic Surgery Specific Fields
   */

  /**
   * Number of photos from this consultation
   * Critical for before/after tracking
   */
  readonly photoCount: number;

  /**
   * Whether consultation has before photos
   * Important for aesthetic surgery workflow
   */
  readonly hasBeforePhotos: boolean;

  /**
   * Whether consultation has after photos
   * Indicates post-procedure follow-up
   */
  readonly hasAfterPhotos: boolean;

  /**
   * Whether a case plan was created
   * Links to surgical planning workflow
   */
  readonly hasCasePlan: boolean;

  /**
   * Case plan ID if one exists
   */
  readonly casePlanId?: number;

  /**
   * Whether patient proceeded with procedure
   * Derived from patientDecision === YES
   */
  readonly patientProceeded: boolean;
}

/**
 * Response DTO for patient consultation history
 */
export interface PatientConsultationHistoryDto {
  /**
   * Patient ID
   */
  readonly patientId: string;

  /**
   * Total number of consultations
   */
  readonly totalCount: number;

  /**
   * Consultations ordered by date (most recent first)
   */
  readonly consultations: PatientConsultationHistoryItemDto[];

  /**
   * Summary statistics (for quick overview)
   */
  readonly summary: {
    /**
     * Total consultations
     */
    readonly total: number;

    /**
     * Completed consultations
     */
    readonly completed: number;

    /**
     * Consultations where procedure was recommended
     */
    readonly proceduresRecommended: number;

    /**
     * Consultations where patient proceeded
     */
    readonly proceduresProceeded: number;

    /**
     * Total photos across all consultations
     */
    readonly totalPhotos: number;
  };
}
