/**
 * Application Layer — Shared Result Types
 *
 * Generic outcome types for Application Layer operations.
 * Allows domain-specific error typing while maintaining a uniform shape.
 */

/**
 * Successful result containing data.
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed result containing an error.
 *
 * The error type is generic to allow domain-specific error shapes
 * (e.g. ClinicalError, AuthorizationError, ValidationError).
 */
export interface Failure<E = Error> {
  readonly success: false;
  readonly error: E;
}

/**
 * Discriminated union for Application Layer operation outcomes.
 *
 * @template T - The success data type.
 * @template E - The error type. Defaults to `Error` for simple cases.
 *
 * @example
 * ```typescript
 * // Domain-specific error typing
 * type SaveDraftResult = Result<ConsultationResponseDto, ClinicalError>;
 *
 * // Simple success/failure
 * type ClearResult = Result<void, Error>;
 * ```
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Create a successful result.
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create a failed result.
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard for successful results.
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard for failed results.
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}
