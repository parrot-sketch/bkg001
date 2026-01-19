/**
 * DTO: AcceptConsultationRequestDto
 * 
 * Data Transfer Object for accepting a consultation request by a doctor.
 * This represents input data when a doctor accepts a consultation request.
 */
export interface AcceptConsultationRequestDto {
  /**
   * Appointment ID (consultation request ID)
   */
  readonly appointmentId: number;

  /**
   * Doctor ID who is accepting the request
   */
  readonly doctorId: string;

  /**
   * Optional appointment date (if doctor wants to set date/time immediately)
   */
  readonly appointmentDate?: Date;

  /**
   * Optional appointment time (if doctor wants to set date/time immediately)
   */
  readonly time?: string;

  /**
   * Optional notes from doctor
   */
  readonly notes?: string;
}
