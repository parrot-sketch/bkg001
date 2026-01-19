/**
 * DTO: ConsultationResponseDto
 * 
 * Data Transfer Object for consultation response data.
 * Designed for aesthetic surgery workflows with emphasis on:
 * - Photo tracking (before/after, consent-aware)
 * - Decision status (proceeded, declined, undecided)
 * - Timeline-based UI support
 * - Fast doctor scanning
 * 
 * This DTO represents the output data from consultation-related use cases.
 */

import { ConsultationState } from '../../domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../domain/enums/PatientDecision';

export interface ConsultationResponseDto {
  /**
   * Consultation's unique identifier
   */
  readonly id: number;

  /**
   * Associated appointment ID (1:1 relationship)
   */
  readonly appointmentId: number;

  /**
   * Doctor's unique identifier
   */
  readonly doctorId: string;

  /**
   * User ID who started the consultation
   */
  readonly userId?: string;

  /**
   * Current state of the consultation
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
   * Duration in minutes (calculated if completed)
   */
  readonly durationMinutes?: number;

  /**
   * Consultation notes (structured or raw text)
   * For aesthetic surgery: May include patient goals, examination findings,
   * procedure discussion, recommendations, treatment plan
   */
  readonly notes?: {
    /**
     * Full text representation (always available)
     */
    readonly fullText: string;

    /**
     * Structured notes (if available)
     */
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };

  /**
   * Consultation outcome type (required when completed)
   */
  readonly outcomeType?: ConsultationOutcomeType;

  /**
   * Patient decision (required if PROCEDURE_RECOMMENDED)
   * Critical for aesthetic surgery workflow tracking
   */
  readonly patientDecision?: PatientDecision;

  /**
   * Follow-up appointment information
   */
  readonly followUp?: {
    readonly date?: Date;
    readonly type?: string;
    readonly notes?: string;
  };

  /**
   * Timestamps
   */
  readonly createdAt: Date;
  readonly updatedAt: Date;

  /**
   * Aesthetic Surgery Specific Fields
   */

  /**
   * Number of photos associated with this consultation
   * Critical for aesthetic surgery: before photos, examination photos, etc.
   */
  readonly photoCount?: number;

  /**
   * Whether consultation has photos with marketing consent
   * Important for legal/compliance tracking
   */
  readonly hasMarketingConsentPhotos?: boolean;

  /**
   * Whether a case plan was created from this consultation
   * Links to surgical planning workflow
   */
  readonly hasCasePlan?: boolean;

  /**
   * Case plan ID if one exists
   */
  readonly casePlanId?: number;
}
