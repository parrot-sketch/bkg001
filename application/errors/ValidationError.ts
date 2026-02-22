/**
 * Application Error: ValidationError
 *
 * Thrown when input validation fails.
 * Used for request body validation, query parameter validation, etc.
 */

import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';

export interface ValidationFieldError {
  field: string;
  message: string;
}

export class ValidationError extends DomainException {
  public readonly code = ApiErrorCode.VALIDATION_ERROR;
  public readonly errors: ValidationFieldError[];

  constructor(
    message: string,
    errors: ValidationFieldError[] = []
  ) {
    super(message, { errors });
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Create a ValidationError from a Zod validation error
   */
  static fromZodError(zodError: import('zod').ZodError, message: string = 'Validation failed'): ValidationError {
    const errors: ValidationFieldError[] = zodError.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return new ValidationError(message, errors);
  }
}
