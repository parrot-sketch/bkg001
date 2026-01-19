import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: Email
 * 
 * Represents a valid email address.
 * Immutable and validated upon construction.
 * 
 * Business Rules:
 * - Must be a valid email format
 * - Must not be empty
 * - Must be lowercase for consistency
 */
export class Email {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  private constructor(private readonly value: string) {
    // Value is set in factory method after validation
  }

  /**
   * Creates an Email value object from a string
   * 
   * @param email - The email address string
   * @returns Email value object
   * @throws DomainException if email is invalid
   */
  static create(email: string): Email {
    if (!email || typeof email !== 'string') {
      throw new DomainException('Email cannot be empty or null', {
        providedValue: email,
      });
    }

    const trimmed = email.trim();

    if (trimmed.length === 0) {
      throw new DomainException('Email cannot be empty', {
        providedValue: email,
      });
    }

    if (trimmed.length > 254) {
      // RFC 5321 limit for email address length
      throw new DomainException('Email address is too long (max 254 characters)', {
        providedValue: email,
        length: trimmed.length,
      });
    }

    const normalized = trimmed.toLowerCase();

    if (!Email.EMAIL_REGEX.test(normalized)) {
      throw new DomainException('Email address format is invalid', {
        providedValue: email,
        normalizedValue: normalized,
      });
    }

    return new Email(normalized);
  }

  /**
   * Gets the email address as a string
   * 
   * @returns The email address string (always lowercase)
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Gets the domain part of the email address
   * 
   * @returns The domain part (e.g., "example.com" from "user@example.com")
   */
  getDomain(): string {
    const parts = this.value.split('@');
    return parts[1] || '';
  }

  /**
   * Gets the local part of the email address
   * 
   * @returns The local part (e.g., "user" from "user@example.com")
   */
  getLocalPart(): string {
    const parts = this.value.split('@');
    return parts[0] || '';
  }

  /**
   * Checks equality with another Email value object
   * 
   * @param other - Another Email value object
   * @returns true if emails are equal (case-insensitive)
   */
  equals(other: Email | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return this.value;
  }
}
