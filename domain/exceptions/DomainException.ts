/**
 * Domain Exception: DomainException
 * 
 * Base exception class for all domain-level errors.
 * All domain exceptions should extend this class.
 * 
 * This allows for consistent error handling and distinguishes
 * domain errors from infrastructure/framework errors.
 */
export class DomainException extends Error {
  /**
   * Optional metadata to provide additional context about the error
   */
  public readonly metadata?: Record<string, unknown>;

  /**
   * Creates a new DomainException
   * 
   * @param message - Human-readable error message
   * @param metadata - Optional metadata for additional context
   */
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainException';
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainException);
    }
  }

  /**
   * Creates a formatted string representation of the exception
   */
  toString(): string {
    const metadataStr = this.metadata
      ? `\nMetadata: ${JSON.stringify(this.metadata, null, 2)}`
      : '';
    return `${this.name}: ${this.message}${metadataStr}`;
  }
}
