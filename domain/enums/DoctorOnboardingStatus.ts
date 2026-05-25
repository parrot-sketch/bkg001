/**
 * Domain Enum: DoctorOnboardingStatus
 * 
 * Represents the onboarding lifecycle status of a doctor in the healthcare system.
 * Doctors do NOT self-register - they are invited by admins/frontdesk and must complete
 * onboarding before they can use the system.
 * 
 * State Machine:
 * INVITED → ACTIVATED → PROFILE_COMPLETED → SCHEDULE_SETUP → ACTIVE
 * 
 * INVARIANT: INVITED doctors cannot authenticate (must activate via invite token).
 * 
 * This is a pure TypeScript enum with no framework dependencies.
 */

export enum DoctorOnboardingStatus {
  INVITED = 'INVITED',
  ACTIVATED = 'ACTIVATED',
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  SCHEDULE_SETUP = 'SCHEDULE_SETUP',
  ACTIVE = 'ACTIVE',
}

/**
 * Type guard to check if a string is a valid DoctorOnboardingStatus
 */
export function isDoctorOnboardingStatus(value: string): value is DoctorOnboardingStatus {
  return Object.values(DoctorOnboardingStatus).includes(value as DoctorOnboardingStatus);
}

/**
 * Check if a doctor onboarding status allows authentication
 * 
 * INVARIANT: Doctors can authenticate once activated (ACTIVATED, PROFILE_COMPLETED, SCHEDULE_SETUP, ACTIVE)
 * Only INVITED doctors cannot authenticate (must activate via token first)
 */
export function canDoctorAuthenticate(status: DoctorOnboardingStatus): boolean {
  return [
    DoctorOnboardingStatus.ACTIVATED,
    DoctorOnboardingStatus.PROFILE_COMPLETED,
    DoctorOnboardingStatus.SCHEDULE_SETUP,
    DoctorOnboardingStatus.ACTIVE,
  ].includes(status);
}

/**
 * Check if a doctor onboarding status requires action
 */
export function requiresOnboardingAction(status: DoctorOnboardingStatus): boolean {
  return [
    DoctorOnboardingStatus.INVITED,
    DoctorOnboardingStatus.ACTIVATED,
    DoctorOnboardingStatus.PROFILE_COMPLETED,
    DoctorOnboardingStatus.SCHEDULE_SETUP,
  ].includes(status);
}

/**
 * Valid state transitions for doctor onboarding
 * Returns true if transition from 'from' to 'to' is allowed
 * 
 * Valid transitions:
 * - INVITED → ACTIVATED (via invite token activation)
 * - ACTIVATED → PROFILE_COMPLETED (after completing required profile fields)
 * - PROFILE_COMPLETED → SCHEDULE_SETUP (schedule configuration step)
 * - SCHEDULE_SETUP → ACTIVE (schedule configured, ready for appointments)
 */
export function isValidDoctorOnboardingTransition(
  from: DoctorOnboardingStatus | null,
  to: DoctorOnboardingStatus
): boolean {
  // Null (no status) can transition to INVITED (new doctor invitation)
  if (from === null) {
    return to === DoctorOnboardingStatus.INVITED;
  }

  // Valid transitions from each state
  const validTransitions: Record<DoctorOnboardingStatus, DoctorOnboardingStatus[]> = {
    [DoctorOnboardingStatus.INVITED]: [
      DoctorOnboardingStatus.ACTIVATED, // Doctor activates via invite token
    ],
    [DoctorOnboardingStatus.ACTIVATED]: [
      DoctorOnboardingStatus.PROFILE_COMPLETED, // After completing required profile fields
    ],
    [DoctorOnboardingStatus.PROFILE_COMPLETED]: [
      DoctorOnboardingStatus.SCHEDULE_SETUP, // Schedule configuration step
    ],
    [DoctorOnboardingStatus.SCHEDULE_SETUP]: [
      DoctorOnboardingStatus.ACTIVE, // Schedule configured, ready for appointments
    ],
    [DoctorOnboardingStatus.ACTIVE]: [
      // No transitions from ACTIVE - it's the final state
      // Further status changes use User.status (ACTIVE, INACTIVE, DORMANT)
    ],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get user-friendly status label for display
 */
export function getDoctorOnboardingStatusLabel(status: DoctorOnboardingStatus): string {
  const labels: Record<DoctorOnboardingStatus, string> = {
    [DoctorOnboardingStatus.INVITED]: 'Invited',
    [DoctorOnboardingStatus.ACTIVATED]: 'Activated',
    [DoctorOnboardingStatus.PROFILE_COMPLETED]: 'Profile Completed',
    [DoctorOnboardingStatus.SCHEDULE_SETUP]: 'Schedule Setup',
    [DoctorOnboardingStatus.ACTIVE]: 'Active',
  };

  return labels[status];
}

/**
 * Get user-friendly status description
 */
export function getDoctorOnboardingStatusDescription(status: DoctorOnboardingStatus): string {
  const descriptions: Record<DoctorOnboardingStatus, string> = {
    [DoctorOnboardingStatus.INVITED]: 'You have been invited. Please check your email to activate your account.',
    [DoctorOnboardingStatus.ACTIVATED]: 'Your account has been activated. Please complete your profile to continue.',
    [DoctorOnboardingStatus.PROFILE_COMPLETED]: 'Your profile is complete. Please configure your schedule to start accepting appointments.',
    [DoctorOnboardingStatus.SCHEDULE_SETUP]: 'Configure your weekly availability and appointment slots to start accepting patients.',
    [DoctorOnboardingStatus.ACTIVE]: 'Your account is active. You can now access the system.',
  };

  return descriptions[status];
}
