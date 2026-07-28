/**
 * Shared Kernel — Guard Registry
 *
 * Registry interface for workflow transition guards.
 * Maps (fromState, action) pairs to ordered arrays of guard functions.
 */

import type { GuardFunction } from './GuardContext';
import type { GuardResult } from './GuardResult';

/**
 * Registration for a guard on a specific transition.
 */
export interface GuardRegistration {
  readonly from: string;
  readonly action: string;
  readonly guard: GuardFunction;
}

/**
 * Registry interface for workflow guards.
 */
export interface GuardRegistry {
  getGuards(from: string, action: string): readonly GuardFunction[];
  register(registration: GuardRegistration): void;
  getAllRegistrations(): readonly GuardRegistration[];
}
