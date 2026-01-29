/**
 * Domain Enum: AppointmentStatus
 * 
 * Represents the status of an appointment in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 * 
 * Status Flow:
 * - PENDING: Initial state, waiting for doctor confirmation
 * - PENDING_DOCTOR_CONFIRMATION: Frontdesk scheduled, awaiting doctor confirmation
 * - CONFIRMED: Patient confirmed appointment (deprecated, use SCHEDULED)
 * - SCHEDULED: Doctor confirmed OR appointment is officially scheduled
 * - COMPLETED: Appointment conducted and finished
 * - CANCELLED: Appointment cancelled
 * - NO_SHOW: Patient did not arrive
 */
export enum AppointmentStatus {
  PENDING = 'PENDING',
  PENDING_DOCTOR_CONFIRMATION = 'PENDING_DOCTOR_CONFIRMATION', // NEW: Awaiting doctor confirmation
  CONFIRMED = 'CONFIRMED', // Patient confirmed appointment
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW', // Patient did not arrive
}

/**
 * Type guard to check if a string is a valid AppointmentStatus
 */
export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return Object.values(AppointmentStatus).includes(value as AppointmentStatus);
}

/**
 * Check if an appointment status allows modifications
 */
export function isAppointmentModifiable(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
         status === AppointmentStatus.SCHEDULED;
}

/**
 * Check if an appointment status is final (cannot be changed)
 */
export function isAppointmentFinal(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.CANCELLED || 
         status === AppointmentStatus.COMPLETED ||
         status === AppointmentStatus.NO_SHOW;
}

/**
 * Check if appointment can be checked in
 */
export function canCheckIn(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}

/**
 * Check if appointment can start consultation
 * 
 * BUGFIX (Phase 3): Only SCHEDULED appointments can start consultation.
 * PENDING appointments have not yet been confirmed and should not start.
 */
export function canStartConsultation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED;
}

/**
 * Check if appointment can be marked as no-show
 */
export function canMarkNoShow(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}

/**
 * Check if appointment is awaiting doctor confirmation
 */
export function isPendingDoctorConfirmation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
}

/**
 * Check if appointment is confirmed/scheduled (not pending)
 */
export function isConfirmed(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED || 
         status === AppointmentStatus.CONFIRMED;
}
