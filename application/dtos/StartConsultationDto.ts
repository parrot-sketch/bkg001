/**
 * DTO: StartConsultationDto
 * 
 * Data Transfer Object for starting a consultation.
 * This DTO represents the input data for the StartConsultationUseCase.
 */
export interface StartConsultationDto {
  /**
   * Appointment's unique identifier
   */
  readonly appointmentId: number;

  /**
   * Doctor's ID (from Doctor table)
   */
  readonly doctorId: string;

  /**
   * User ID of the doctor starting the consultation (from User table)
   */
  readonly userId: string;

  /**
   * Optional: Initial notes from the doctor
   */
  readonly doctorNotes?: string;
}
