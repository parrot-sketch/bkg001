/**
 * Application Error: NotFoundError
 *
 * Thrown when a requested resource is not found.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export class NotFoundError extends DomainException {
  public readonly code = ApiErrorCode.NOT_FOUND;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message, {
      resourceType,
      resourceId,
    });
    this.name = 'NotFoundError';
  }
}
