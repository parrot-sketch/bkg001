/**
 * Domain Enum: AppointmentStatus
 * 
 * Represents the status of an appointment in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum AppointmentStatus {
  PENDING = 'PENDING',
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
  return status === AppointmentStatus.PENDING || status === AppointmentStatus.SCHEDULED;
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
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}

/**
 * Check if appointment can start consultation
 */
export function canStartConsultation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED || 
         status === AppointmentStatus.PENDING;
}

/**
 * Check if appointment can be marked as no-show
 */
export function canMarkNoShow(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}
