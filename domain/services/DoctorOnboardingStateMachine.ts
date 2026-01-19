/**
 * Domain Service: DoctorOnboardingStateMachine
 * 
 * Manages state transitions for doctor onboarding.
 * Enforces valid transitions and prevents invalid state changes.
 * 
 * This is a pure domain service with no infrastructure dependencies.
 */

import { DoctorOnboardingStatus, isValidDoctorOnboardingTransition } from '../enums/DoctorOnboardingStatus';
import { DomainException } from '../exceptions/DomainException';

/**
 * Validates and performs a state transition
 * 
 * @param from - Current onboarding status
 * @param to - Target onboarding status
 * @throws DomainException if transition is invalid
 */
export function transitionDoctorOnboardingStatus(
  from: DoctorOnboardingStatus | null,
  to: DoctorOnboardingStatus
): DoctorOnboardingStatus {
  if (!isValidDoctorOnboardingTransition(from, to)) {
    const fromLabel = from ?? 'null';
    throw new DomainException(
      `Invalid onboarding status transition: ${fromLabel} → ${to}. Valid transitions are defined by the onboarding state machine.`,
      {
        fromStatus: from,
        toStatus: to,
      }
    );
  }

  return to;
}

/**
 * Get the next valid state in the onboarding flow
 * 
 * @param currentStatus - Current onboarding status
 * @returns Next valid status or null if already at final state
 */
export function getNextOnboardingStatus(
  currentStatus: DoctorOnboardingStatus
): DoctorOnboardingStatus | null {
  const nextStates: Record<DoctorOnboardingStatus, DoctorOnboardingStatus | null> = {
    [DoctorOnboardingStatus.INVITED]: DoctorOnboardingStatus.ACTIVATED,
    [DoctorOnboardingStatus.ACTIVATED]: DoctorOnboardingStatus.PROFILE_COMPLETED,
    [DoctorOnboardingStatus.PROFILE_COMPLETED]: DoctorOnboardingStatus.ACTIVE,
    [DoctorOnboardingStatus.ACTIVE]: null, // Final state
  };

  return nextStates[currentStatus] ?? null;
}
