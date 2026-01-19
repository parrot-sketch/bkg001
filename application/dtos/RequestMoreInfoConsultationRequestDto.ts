/**
 * DTO: RequestMoreInfoConsultationRequestDto
 * 
 * Data Transfer Object for requesting more information on a consultation request by a doctor.
 * This represents input data when a doctor requests more information from the patient.
 */
export interface RequestMoreInfoConsultationRequestDto {
  /**
   * Appointment ID (consultation request ID)
   */
  readonly appointmentId: number;

  /**
   * Doctor ID who is requesting more information
   */
  readonly doctorId: string;

  /**
   * Questions or notes for the patient (required)
   */
  readonly questions: string;

  /**
   * Optional additional notes
   */
  readonly notes?: string;
}
