/**
 * DTO: AddAppointmentNotesDto
 * 
 * Data Transfer Object for adding/updating appointment notes (pre-consultation).
 */
export interface AddAppointmentNotesDto {
  /**
   * Appointment ID
   */
  readonly appointmentId: number;

  /**
   * Doctor ID who is adding notes
   */
  readonly doctorId: string;

  /**
   * Notes to add/update
   */
  readonly notes: string;
}
