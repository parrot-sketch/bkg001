/**
 * Domain Enum: ConsultationRequestStatus
 * 
 * Represents the lifecycle status of a consultation request in the healthcare system.
 * This tracks the workflow from patient submission through review, approval, scheduling, and confirmation.
 * 
 * This is separate from AppointmentStatus, which tracks the appointment lifecycle.
 * ConsultationRequestStatus handles the pre-appointment workflow.
 * 
 * This is a pure TypeScript enum with no framework dependencies.
 */

export enum ConsultationRequestStatus {
  SUBMITTED = 'SUBMITTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
}

/**
 * Type guard to check if a string is a valid ConsultationRequestStatus
 */
export function isConsultationRequestStatus(value: string): value is ConsultationRequestStatus {
  return Object.values(ConsultationRequestStatus).includes(value as ConsultationRequestStatus);
}

/**
 * Check if a consultation request status allows modifications by frontdesk
 */
export function isConsultationRequestModifiable(status: ConsultationRequestStatus): boolean {
  return [
    ConsultationRequestStatus.SUBMITTED,
    ConsultationRequestStatus.PENDING_REVIEW,
    ConsultationRequestStatus.NEEDS_MORE_INFO,
  ].includes(status);
}

/**
 * Check if a consultation request status is in final states (cannot be modified)
 */
export function isConsultationRequestFinal(status: ConsultationRequestStatus): boolean {
  return [
    ConsultationRequestStatus.CONFIRMED,
  ].includes(status);
}

/**
 * Check if a consultation request has been approved (can proceed to scheduling)
 */
export function isConsultationRequestApproved(status: ConsultationRequestStatus): boolean {
  return [
    ConsultationRequestStatus.APPROVED,
    ConsultationRequestStatus.SCHEDULED,
    ConsultationRequestStatus.CONFIRMED,
  ].includes(status);
}

/**
 * Check if a consultation request is ready for patient action
 */
export function isConsultationRequestPendingPatientAction(status: ConsultationRequestStatus): boolean {
  return [
    ConsultationRequestStatus.NEEDS_MORE_INFO,
    ConsultationRequestStatus.SCHEDULED,
  ].includes(status);
}

/**
 * Valid state transitions for consultation requests
 * Returns true if transition from 'from' to 'to' is allowed
 */
export function isValidConsultationRequestTransition(
  from: ConsultationRequestStatus | null,
  to: ConsultationRequestStatus
): boolean {
  // Null (no status) can transition to SUBMITTED (new request)
  if (from === null) {
    return to === ConsultationRequestStatus.SUBMITTED;
  }

  // Valid transitions from each state
  const validTransitions: Record<ConsultationRequestStatus, ConsultationRequestStatus[]> = {
    [ConsultationRequestStatus.SUBMITTED]: [
      ConsultationRequestStatus.PENDING_REVIEW,
      ConsultationRequestStatus.CANCELLED as any, // Handled by AppointmentStatus
    ],
    [ConsultationRequestStatus.PENDING_REVIEW]: [
      ConsultationRequestStatus.APPROVED,
      ConsultationRequestStatus.NEEDS_MORE_INFO,
      ConsultationRequestStatus.CANCELLED as any, // Handled by AppointmentStatus
    ],
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: [
      ConsultationRequestStatus.SUBMITTED, // Patient resubmits with more info
      ConsultationRequestStatus.PENDING_REVIEW,
      ConsultationRequestStatus.CANCELLED as any, // Handled by AppointmentStatus
    ],
    [ConsultationRequestStatus.APPROVED]: [
      ConsultationRequestStatus.SCHEDULED,
      ConsultationRequestStatus.CANCELLED as any, // Handled by AppointmentStatus
    ],
    [ConsultationRequestStatus.SCHEDULED]: [
      ConsultationRequestStatus.CONFIRMED,
      ConsultationRequestStatus.CANCELLED as any, // Handled by AppointmentStatus
    ],
    [ConsultationRequestStatus.CONFIRMED]: [
      // No transitions from CONFIRMED - it's a final state
      // Further changes use AppointmentStatus (COMPLETED, etc.)
    ],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get user-friendly status label for display
 */
export function getConsultationRequestStatusLabel(status: ConsultationRequestStatus): string {
  const labels: Record<ConsultationRequestStatus, string> = {
    [ConsultationRequestStatus.SUBMITTED]: 'Submitted',
    [ConsultationRequestStatus.PENDING_REVIEW]: 'Under Review',
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: 'Needs More Information',
    [ConsultationRequestStatus.APPROVED]: 'Approved',
    [ConsultationRequestStatus.SCHEDULED]: 'Scheduled',
    [ConsultationRequestStatus.CONFIRMED]: 'Confirmed',
  };

  return labels[status];
}

/**
 * Get user-friendly status description for patients
 */
export function getConsultationRequestStatusDescription(status: ConsultationRequestStatus): string {
  const descriptions: Record<ConsultationRequestStatus, string> = {
    [ConsultationRequestStatus.SUBMITTED]: 'Your request has been received and is being processed.',
    [ConsultationRequestStatus.PENDING_REVIEW]: 'Your request is being reviewed by our clinical team.',
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: 'We need additional information to proceed with your request.',
    [ConsultationRequestStatus.APPROVED]: 'Your request has been approved and is ready to be scheduled.',
    [ConsultationRequestStatus.SCHEDULED]: 'A time has been proposed. Please confirm your availability.',
    [ConsultationRequestStatus.CONFIRMED]: 'Your consultation has been confirmed. We look forward to seeing you.',
  };

  return descriptions[status];
}