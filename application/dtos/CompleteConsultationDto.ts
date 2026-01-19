import { ConsultationOutcomeType } from '../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../domain/enums/PatientDecision';

/**
 * DTO: CompleteConsultationDto
 * 
 * Data Transfer Object for completing a consultation.
 * This DTO represents the input data for the CompleteConsultationUseCase.
 */
export interface CompleteConsultationDto {
  /**
   * Appointment's unique identifier
   */
  readonly appointmentId: number;

  /**
   * Doctor's user ID completing the consultation
   */
  readonly doctorId: string;

  /**
   * Consultation summary/notes (required)
   */
  readonly outcome: string;

  /**
   * Type of consultation outcome (required)
   * Determines which workflow path to follow
   */
  readonly outcomeType: ConsultationOutcomeType;

  /**
   * Patient decision (required if outcomeType is PROCEDURE_RECOMMENDED)
   * YES: Patient wants to proceed → Create active CasePlan
   * NO: Patient declines → May cancel CasePlan
   * PENDING: Patient needs time → Create CasePlan with PENDING_DECISION status
   */
  readonly patientDecision?: PatientDecision;

  /**
   * Procedure details (optional, if procedure recommended)
   */
  readonly procedureRecommended?: {
    readonly procedureType?: string;
    readonly urgency?: string;
    readonly notes?: string;
  };

  /**
   * Referral information (optional, if referral needed)
   */
  readonly referralInfo?: {
    readonly doctorName?: string;
    readonly reason?: string;
    readonly contactInfo?: string;
  };

  /**
   * Optional: Follow-up appointment date if needed
   */
  readonly followUpDate?: Date;

  /**
   * Optional: Follow-up appointment time if needed
   */
  readonly followUpTime?: string;

  /**
   * Optional: Type of follow-up appointment if needed
   */
  readonly followUpType?: string;
}
