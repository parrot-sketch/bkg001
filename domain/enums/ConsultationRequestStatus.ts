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
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
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
    ConsultationRequestStatus.COMPLETED,
    ConsultationRequestStatus.CANCELLED,
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
  // Note: Cancellation is handled by AppointmentStatus, not ConsultationRequestStatus
  const validTransitions: Record<ConsultationRequestStatus, ConsultationRequestStatus[]> = {
    [ConsultationRequestStatus.SUBMITTED]: [
      ConsultationRequestStatus.PENDING_REVIEW, // Auto-transition (optional)
      ConsultationRequestStatus.APPROVED, // Direct approval by frontdesk
      ConsultationRequestStatus.NEEDS_MORE_INFO, // Direct request for more info
    ],
    [ConsultationRequestStatus.PENDING_REVIEW]: [
      ConsultationRequestStatus.APPROVED,
      ConsultationRequestStatus.NEEDS_MORE_INFO,
    ],
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: [
      ConsultationRequestStatus.SUBMITTED, // Patient resubmits with more info
      ConsultationRequestStatus.PENDING_REVIEW,
    ],
    [ConsultationRequestStatus.APPROVED]: [
      ConsultationRequestStatus.SCHEDULED,
    ],
    [ConsultationRequestStatus.SCHEDULED]: [
      ConsultationRequestStatus.CONFIRMED,
    ],
    [ConsultationRequestStatus.CONFIRMED]: [
      ConsultationRequestStatus.COMPLETED,
      ConsultationRequestStatus.CANCELLED,
    ],
    [ConsultationRequestStatus.COMPLETED]: [],
    [ConsultationRequestStatus.CANCELLED]: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get user-friendly status label for display
 * Premium aesthetic clinic language
 */
export function getConsultationRequestStatusLabel(status: ConsultationRequestStatus): string {
  const labels: Record<ConsultationRequestStatus, string> = {
    [ConsultationRequestStatus.SUBMITTED]: 'Inquiry Received',
    [ConsultationRequestStatus.PENDING_REVIEW]: 'Under Review',
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: 'Clarification Required',
    [ConsultationRequestStatus.APPROVED]: 'Accepted for Scheduling',
    [ConsultationRequestStatus.SCHEDULED]: 'Session Proposed',
    [ConsultationRequestStatus.CONFIRMED]: 'Confirmed',
    [ConsultationRequestStatus.COMPLETED]: 'Completed',
    [ConsultationRequestStatus.CANCELLED]: 'Withdrawn/Not Suitable',
  };

  return labels[status];
}

/**
 * Get user-friendly status description for patients
 * Premium aesthetic clinic language - calm, professional, reassuring
 */
export function getConsultationRequestStatusDescription(status: ConsultationRequestStatus): string {
  const descriptions: Record<ConsultationRequestStatus, string> = {
    [ConsultationRequestStatus.SUBMITTED]: 'Your inquiry has been received. Our team will review it shortly.',
    [ConsultationRequestStatus.PENDING_REVIEW]: 'Your inquiry is being carefully reviewed by our surgical team.',
    [ConsultationRequestStatus.NEEDS_MORE_INFO]: 'We would like to gather a bit more information to better understand your needs.',
    [ConsultationRequestStatus.APPROVED]: 'Your inquiry has been accepted. We will contact you shortly to schedule your session.',
    [ConsultationRequestStatus.SCHEDULED]: 'A session time has been proposed. Please confirm if this works for you.',
    [ConsultationRequestStatus.CONFIRMED]: 'Your session has been confirmed. We look forward to meeting with you.',
    [ConsultationRequestStatus.COMPLETED]: 'This consultation process has been successfully completed.',
    [ConsultationRequestStatus.CANCELLED]: 'This inquiry has been withdrawn or marked as not suitable at this time.',
  };

  return descriptions[status];
}