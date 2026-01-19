/**
 * DTO: MarkNoShowDto
 * 
 * Data Transfer Object for marking an appointment as a no-show.
 * This DTO represents the input data for the MarkNoShowUseCase.
 */
export interface MarkNoShowDto {
  /**
   * Appointment's unique identifier
   */
  readonly appointmentId: number;

  /**
   * User ID marking the no-show (for audit purposes)
   */
  readonly userId: string;

  /**
   * Reason for no-show (required)
   * Common values: 'AUTO', 'MANUAL', 'PATIENT_CALLED', 'NO_CONTACT', etc.
   */
  readonly reason: string;

  /**
   * Optional notes about the no-show
   */
  readonly notes?: string;
}
