/**
 * DTO: SaveConsultationDraftDto
 * 
 * Data Transfer Object for saving consultation draft notes.
 * 
 * For aesthetic surgery centers, draft notes are legally sensitive and must support:
 * - Version safety (prevent overwriting newer versions)
 * - Audit-friendly structure
 * - Future extensibility (structured fields)
 * 
 * This DTO represents the input data for the SaveConsultationDraftUseCase.
 */

export interface SaveConsultationDraftDto {
  /**
   * Appointment's unique identifier (used to find consultation)
   */
  readonly appointmentId: number;

  /**
   * Doctor's user ID saving the draft
   * Must match consultation's doctor
   */
  readonly doctorId: string;

  /**
   * Draft notes content
   * Can be raw text or structured (chief complaint, examination, assessment, plan)
   */
  readonly notes: {
    /**
     * Raw text notes (simple format)
     */
    readonly rawText?: string;

    /**
     * Structured notes (preferred for aesthetic surgery documentation)
     */
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };

  /**
   * Optional: Consultation outcome type (persisted as draft so it survives refreshes)
   */
  readonly outcomeType?: import('../../domain/enums/ConsultationOutcomeType').ConsultationOutcomeType;

  /**
   * Optional: Patient decision (persisted as draft when outcome is PROCEDURE_RECOMMENDED)
   */
  readonly patientDecision?: import('../../domain/enums/PatientDecision').PatientDecision;

  /**
   * Optional: Version token for optimistic locking
   * If provided, ensures we're not overwriting a newer version
   * Frontend should track updatedAt timestamp as version token
   */
  readonly versionToken?: string;
}
