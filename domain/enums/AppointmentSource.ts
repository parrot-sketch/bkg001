/**
 * Domain Enum: AppointmentSource
 * 
 * Identifies who/what created an appointment. Used to determine
 * the default status and whether doctor confirmation is required.
 * 
 * === SOURCE → STATUS MAPPING ===
 * 
 * PATIENT_REQUESTED     → PENDING_DOCTOR_CONFIRMATION (doctor must confirm)
 * FRONTDESK_SCHEDULED   → SCHEDULED (clinic staff = trusted)
 * DOCTOR_FOLLOW_UP      → SCHEDULED (doctor created it = auto-confirmed)
 * ADMIN_SCHEDULED       → SCHEDULED (admin = trusted)
 */
export enum AppointmentSource {
  /** Patient booked via portal — requires doctor confirmation */
  PATIENT_REQUESTED = 'PATIENT_REQUESTED',

  /** Front-desk staff booked on behalf of patient — trusted, auto-scheduled */
  FRONTDESK_SCHEDULED = 'FRONTDESK_SCHEDULED',

  /** Doctor created follow-up after consultation — auto-scheduled */
  DOCTOR_FOLLOW_UP = 'DOCTOR_FOLLOW_UP',

  /** Admin scheduled — auto-scheduled */
  ADMIN_SCHEDULED = 'ADMIN_SCHEDULED',
}

/**
 * Type guard to check if a string is a valid AppointmentSource
 */
export function isAppointmentSource(value: string): value is AppointmentSource {
  return Object.values(AppointmentSource).includes(value as AppointmentSource);
}
