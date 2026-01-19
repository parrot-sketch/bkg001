/**
 * DTO: DeclineConsultationRequestDto
 * 
 * Data Transfer Object for declining a consultation request by a doctor.
 * This represents input data when a doctor declines a consultation request.
 */
export interface DeclineConsultationRequestDto {
  /**
   * Appointment ID (consultation request ID)
   */
  readonly appointmentId: number;

  /**
   * Doctor ID who is declining the request
   */
  readonly doctorId: string;

  /**
   * Optional reason for declining
   */
  readonly reason?: string;
}
