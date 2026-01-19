/**
 * Domain Enum: AppointmentStatus
 * 
 * Represents the status of an appointment in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum AppointmentStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
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
  return status === AppointmentStatus.CANCELLED || status === AppointmentStatus.COMPLETED;
}
