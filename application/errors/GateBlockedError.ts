/**
 * Application Error: GateBlockedError
 *
 * Thrown when a business rule gate blocks an operation.
 * Used for transition gates, checklist gates, etc.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export class GateBlockedError extends DomainException {
  public readonly code = ApiErrorCode.GATE_BLOCKED;
  public readonly blockingCategory: string;
  public readonly missingItems: string[];

  constructor(
    message: string,
    blockingCategory: string,
    missingItems: string[] = []
  ) {
    super(message, {
      gate: blockingCategory,
      blockingCategory,
      missingItems,
    });
    this.name = 'GateBlockedError';
    this.blockingCategory = blockingCategory;
    this.missingItems = missingItems;
  }
}
