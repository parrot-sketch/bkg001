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
   * Outcome/notes from the consultation
   */
  readonly outcome: string;

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
