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
   * Doctor's user ID starting the consultation
   */
  readonly doctorId: string;

  /**
   * Optional: Initial notes from the doctor
   */
  readonly doctorNotes?: string;
}
