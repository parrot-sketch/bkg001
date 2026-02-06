import { SurgicalUrgency } from '@prisma/client';

/**
 * DTO: CreateSurgicalCaseDto
 *
 * Data Transfer Object for creating a new surgical case.
 * Used when a consultation outcome triggers the surgery workflow.
 *
 * Created when:
 * - outcomeType === 'PROCEDURE_RECOMMENDED'
 * - patientDecision === 'YES'
 */
export interface CreateSurgicalCaseDto {
  /**
   * Patient's unique identifier
   */
  readonly patientId: string;

  /**
   * Primary surgeon's doctor ID (the consulting doctor)
   */
  readonly primarySurgeonId: string;

  /**
   * Consultation ID that triggered this surgical case
   */
  readonly consultationId?: number;

  /**
   * Appointment ID (for CasePlan legacy link)
   */
  readonly appointmentId: number;

  /**
   * Surgical urgency level
   */
  readonly urgency?: SurgicalUrgency;

  /**
   * Diagnosis from consultation
   */
  readonly diagnosis?: string;

  /**
   * Recommended procedure name
   */
  readonly procedureName?: string;

  /**
   * User ID who created this case (for audit)
   */
  readonly createdBy?: string;
}

/**
 * DTO: SurgicalCaseResponseDto
 *
 * Response DTO for surgical case queries.
 */
export interface SurgicalCaseResponseDto {
  readonly id: string;
  readonly patientId: string;
  readonly primarySurgeonId: string;
  readonly consultationId?: number;
  readonly urgency: string;
  readonly status: string;
  readonly diagnosis?: string;
  readonly procedureName?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly patient?: {
    readonly id: string;
    readonly fullName: string;
    readonly fileNumber?: string;
  };
  readonly primarySurgeon?: {
    readonly id: string;
    readonly name: string;
  };
  readonly casePlan?: {
    readonly id: number;
    readonly readinessStatus: string;
    readonly readyForSurgery: boolean;
  };
}
