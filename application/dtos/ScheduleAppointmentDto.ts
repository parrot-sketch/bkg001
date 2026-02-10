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

  /**
   * Source: Who/what created this appointment.
   * Determines default status (PATIENT_REQUESTED → needs confirmation, others → auto-scheduled).
   * Defaults to PATIENT_REQUESTED if not provided.
   */
  readonly source?: string;

  /**
   * Optional: Parent appointment ID for follow-up linkage
   */
  readonly parentAppointmentId?: number;

  /**
   * Optional: Parent consultation ID for follow-up linkage
   */
  readonly parentConsultationId?: number;
}
