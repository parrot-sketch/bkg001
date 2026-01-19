/**
 * DTO: ReviewConsultationRequestDto
 * 
 * Data Transfer Object for reviewing a consultation request.
 * This represents input data when Frontdesk (assistant) reviews a consultation request.
 */
export interface ReviewConsultationRequestDto {
  /**
   * Appointment ID (consultation request ID)
   */
  readonly appointmentId: number;

  /**
   * Frontdesk user ID who is reviewing
   */
  readonly reviewedBy: string;

  /**
   * Action taken: 'approve' | 'needs_more_info' | 'reject'
   */
  readonly action: 'approve' | 'needs_more_info' | 'reject';

  /**
   * Proposed appointment date (required if action is 'approve')
   */
  readonly proposedDate?: Date;

  /**
   * Proposed appointment time (required if action is 'approve')
   */
  readonly proposedTime?: string;

  /**
   * Review notes / reason for needs_more_info or rejection
   */
  readonly reviewNotes?: string;
}