/**
 * Shared Kernel — Transition Types
 *
 * Core transition type definitions.
 */

export interface Transition<S, A> {
  readonly from: S;
  readonly action: A;
  readonly to: S;
}
