import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: Password (Plain Text)
 * 
 * Represents a plain text password with validation rules.
 * Used for validation before hashing.
 * 
 * Business Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Optional: at least one special character (recommended)
 * 
 * Security Considerations:
 * - This is plain text - never store or log
 * - Must be hashed immediately after validation
 * - Validation prevents weak passwords
 */
export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128; // Reasonable maximum to prevent DoS
  
  private constructor(private readonly value: string) {
    // Value is private - use getValue() to access (with caution)
  }

  /**
   * Creates a Password value object with validation
   * 
   * @param password - Plain text password
   * @param requireSpecialChar - Whether to require special characters (default: false, recommended: true)
   * @returns Password value object
   * @throws DomainException if password doesn't meet requirements
   */
  static create(password: string, requireSpecialChar: boolean = false): Password {
    if (!password || typeof password !== 'string') {
      throw new DomainException('Password cannot be empty', {
        providedValue: password,
      });
    }

    const trimmed = password.trim();

    if (trimmed.length === 0) {
      throw new DomainException('Password cannot be empty', {
        providedValue: password,
      });
    }

    if (trimmed.length < Password.MIN_LENGTH) {
      throw new DomainException(`Password must be at least ${Password.MIN_LENGTH} characters long`, {
        providedLength: trimmed.length,
        minimumLength: Password.MIN_LENGTH,
      });
    }

    if (trimmed.length > Password.MAX_LENGTH) {
      throw new DomainException(`Password must be at most ${Password.MAX_LENGTH} characters long`, {
        providedLength: trimmed.length,
        maximumLength: Password.MAX_LENGTH,
      });
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(trimmed)) {
      throw new DomainException('Password must contain at least one uppercase letter', {
        providedValue: '***', // Don't expose password
      });
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(trimmed)) {
      throw new DomainException('Password must contain at least one lowercase letter', {
        providedValue: '***',
      });
    }

    // Check for at least one number
    if (!/[0-9]/.test(trimmed)) {
      throw new DomainException('Password must contain at least one number', {
        providedValue: '***',
      });
    }

    // Optional: require special character (recommended for healthcare)
    if (requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmed)) {
      throw new DomainException('Password must contain at least one special character', {
        providedValue: '***',
      });
    }

    // Check for common weak passwords (basic check)
    const commonPasswords = [
      'password',
      'password123',
      '12345678',
      'qwerty123',
      'admin123',
    ];

    const lowercased = trimmed.toLowerCase();
    if (commonPasswords.some(common => lowercased.includes(common))) {
      throw new DomainException('Password is too weak. Please choose a stronger password', {
        providedValue: '***',
      });
    }

    return new Password(trimmed);
  }

  /**
   * Gets the plain text password value
   * 
   * ⚠️ WARNING: This exposes plain text password.
   * Only use this immediately before hashing.
   * Never log, store, or expose this value.
   * 
   * @returns Plain text password string
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Gets password length (for validation/debugging)
   * 
   * @returns Password length
   */
  getLength(): number {
    return this.value.length;
  }

  /**
   * String representation (never exposes actual password)
   */
  toString(): string {
    return '***'; // Never expose password in string representation
  }
}
