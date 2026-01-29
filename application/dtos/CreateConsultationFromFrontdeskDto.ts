/**
 * DTO: CreateConsultationFromFrontdeskDto
 * 
 * Data Transfer Object for creating a consultation request by frontdesk staff.
 * This represents input data when a frontdesk staff member creates a consultation request
 * directly for a patient from the patient listing page.
 */
export interface CreateConsultationFromFrontdeskDto {
  /**
   * Patient's unique identifier
   */
  readonly patientId: string;

  /**
   * Doctor's unique identifier (required - frontdesk selects specific doctor)
   */
  readonly doctorId: string;

  /**
   * Service/consultation type
   */
  readonly serviceId: string;

  /**
   * Appointment date (already determined by frontdesk)
   */
  readonly appointmentDate: Date;

  /**
   * Appointment time
   */
  readonly appointmentTime: string;

  /**
   * Reason for consultation / concern description (from frontdesk observation)
   */
  readonly concernDescription: string;

  /**
   * Additional notes from frontdesk
   */
  readonly notes?: string;
}
