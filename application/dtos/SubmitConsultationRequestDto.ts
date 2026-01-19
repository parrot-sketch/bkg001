/**
 * DTO: SubmitConsultationRequestDto
 * 
 * Data Transfer Object for submitting a consultation request.
 * This represents input data when a patient submits a consultation request via the portal.
 */
export interface SubmitConsultationRequestDto {
  /**
   * Patient's unique identifier
   */
  readonly patientId: string;

  /**
   * Doctor's unique identifier (optional - if not provided, assistant assigns)
   */
  readonly doctorId?: string;

  /**
   * Service/consultation type requested
   */
  readonly serviceId?: string;

  /**
   * Patient's preferred appointment date
   */
  readonly preferredDate?: Date;

  /**
   * Time preference (e.g., "Morning", "Afternoon", "Evening")
   */
  readonly timePreference?: string;

  /**
   * Reason for consultation / concern description
   */
  readonly concernDescription: string;

  /**
   * Additional notes from patient
   */
  readonly notes?: string;

  /**
   * Medical safety information (basic screening)
   */
  readonly medicalInfo?: {
    isOver18: boolean;
    hasSeriousConditions: string;
    isPregnant: string;
  };

  /**
   * Consent fields (required for API validation)
   */
  readonly isOver18?: boolean;
  readonly contactConsent?: boolean;
  readonly privacyConsent?: boolean;
  readonly acknowledgmentConsent?: boolean;
}