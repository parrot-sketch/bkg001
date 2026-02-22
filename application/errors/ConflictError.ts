/**
 * Application Error: ConflictError
 *
 * Thrown when an operation conflicts with the current state of a resource.
 * Used for state machine violations, concurrent modifications, etc.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export class ConflictError extends DomainException {
  public readonly code = ApiErrorCode.CONFLICT;

  constructor(message: string, conflictReason?: string) {
    super(message, { conflictReason });
    this.name = 'ConflictError';
  }
}
