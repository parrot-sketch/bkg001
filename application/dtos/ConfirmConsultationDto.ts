/**
 * DTO: ConfirmConsultationDto
 * 
 * Data Transfer Object for confirming a scheduled consultation.
 * This represents input data when a patient confirms a scheduled consultation time.
 */
export interface ConfirmConsultationDto {
  /**
   * Appointment ID
   */
  readonly appointmentId: number;

  /**
   * Patient ID (for validation)
   */
  readonly patientId: string;
}