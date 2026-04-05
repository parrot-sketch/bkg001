/**
 * Application Error: InsufficientBatchQuantityError
 *
 * Thrown when an inventory batch does not have sufficient quantity_remaining
 * to fulfill a usage request.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export class InsufficientBatchQuantityError extends DomainException {
  public readonly code = ApiErrorCode.GATE_BLOCKED;

  constructor(
    batchId: string,
    requestedQuantity: number,
    availableQuantity: number,
    message?: string
  ) {
    const defaultMessage =
      message ||
      `Insufficient quantity in batch ${batchId}. Requested: ${requestedQuantity}, Available: ${availableQuantity}`;

    super(defaultMessage, {
      batchId,
      requestedQuantity,
      availableQuantity,
    });
    this.name = 'InsufficientBatchQuantityError';
  }
}
