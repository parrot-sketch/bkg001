/**
 * DTO: ScheduleAppointmentDto
 * 
 * Data Transfer Object for scheduling a new appointment.
 * This DTO represents the input data for the ScheduleAppointmentUseCase.
 */
export interface ScheduleAppointmentDto {
  /**
   * Patient's unique identifier
   */
  readonly patientId: string;

  /**
   * Doctor's unique identifier
   */
  readonly doctorId: string;

  /**
   * Desired appointment date
   */
  readonly appointmentDate: Date;

  /**
   * Appointment time (e.g., "10:00 AM")
   */
  readonly time: string;

  /**
   * Type of appointment (e.g., "Consultation", "Follow-up", "Emergency")
   */
  readonly type: string;

  /**
   * Optional: Notes about the appointment
   */
  readonly note?: string;
}
