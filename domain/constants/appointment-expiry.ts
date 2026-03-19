/**
 * Appointment Expiry Constants
 * 
 * Centralized configuration for appointment no-show handling.
 */

export const APPOINTMENT_NO_SHOW_GRACE_MINUTES = 30;

export const APPOINTMENT_NO_SHOW_CONFIG = {
  graceMinutes: APPOINTMENT_NO_SHOW_GRACE_MINUTES,
  graceMilliseconds: APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60 * 1000,
} as const;
