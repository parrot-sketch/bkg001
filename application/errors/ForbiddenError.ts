/**
 * Application Error: ForbiddenError
 *
 * Thrown when access is denied due to insufficient permissions.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export class ForbiddenError extends DomainException {
  public readonly code = ApiErrorCode.FORBIDDEN;

  constructor(message: string, requiredRole?: string) {
    super(message, { requiredRole });
    this.name = 'ForbiddenError';
  }
}
