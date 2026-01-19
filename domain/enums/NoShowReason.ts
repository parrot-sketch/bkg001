/**
 * Domain Enum: NoShowReason
 * 
 * Represents the reason why an appointment was marked as no-show.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum NoShowReason {
  AUTO = 'AUTO', // Automatically detected by system
  MANUAL = 'MANUAL', // Manually marked by frontdesk/doctor
  PATIENT_CALLED = 'PATIENT_CALLED', // Patient called to reschedule/cancel
}

/**
 * Type guard to check if a string is a valid NoShowReason
 */
export function isNoShowReason(value: string): value is NoShowReason {
  return Object.values(NoShowReason).includes(value as NoShowReason);
}

/**
 * Get user-friendly label for no-show reason
 */
export function getNoShowReasonLabel(reason: NoShowReason): string {
  const labels: Record<NoShowReason, string> = {
    [NoShowReason.AUTO]: 'Automatically Detected',
    [NoShowReason.MANUAL]: 'Manually Marked',
    [NoShowReason.PATIENT_CALLED]: 'Patient Called',
  };
  return labels[reason];
}
