/**
 * DTO: CheckInPatientDto
 * 
 * Data Transfer Object for checking in a patient for their appointment.
 * This DTO represents the input data for the CheckInPatientUseCase.
 */
export interface CheckInPatientDto {
  /**
   * Appointment's unique identifier
   */
  readonly appointmentId: number;

  /**
   * User ID performing the check-in (for audit purposes)
   */
  readonly userId: string;

  /**
   * Optional notes from frontdesk (e.g. "Patient complaining of pain")
   */
  readonly notes?: string;
}
