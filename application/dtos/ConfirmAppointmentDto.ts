/**
 * DTO: ConfirmAppointmentDto
 * 
 * Data Transfer Object for confirming an appointment by doctor.
 * This represents input data when a doctor confirms/rejects a pending appointment.
 */
export interface ConfirmAppointmentDto {
  /**
   * Appointment ID to confirm/reject
   */
  readonly appointmentId: number;

  /**
   * Action to perform: 'confirm' or 'reject'
   */
  readonly action: 'confirm' | 'reject';

  /**
   * Reason for rejection (required if action is 'reject')
   */
  readonly rejectionReason?: string;

  /**
   * Doctor's notes (optional)
   */
  readonly notes?: string;
}
