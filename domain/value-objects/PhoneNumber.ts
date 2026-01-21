import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: PhoneNumber
 * 
 * Represents a valid phone number.
 * Immutable and validated upon construction.
 * 
 * Business Rules:
 * - Must contain only digits (and optional + prefix for international)
 * - Must have a minimum length (typically 10 digits)
 * - Must have a maximum length (typically 15 digits including country code)
 * 
 * Note: This implementation assumes 10-digit phone numbers as per current system.
 * International format can be added later if needed.
 */
export class PhoneNumber {
  private static readonly DIGITS_ONLY_REGEX = /^\d+$/;
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 15;

  private constructor(private readonly value: string) {
    // Value is set in factory method after validation
  }

  /**
   * Creates a PhoneNumber value object from a string
   * 
   * @param phoneNumber - The phone number string
   * @returns PhoneNumber value object
   * @throws DomainException if phone number is invalid
   */
  static create(phoneNumber: string): PhoneNumber {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new DomainException('Phone number cannot be empty or null', {
        providedValue: phoneNumber,
      });
    }

    // Remove ALL non-digit, non-plus characters (handles any formatting)
    // This is more aggressive than the original to handle legacy data
    let cleaned = phoneNumber.trim();
    
    // Preserve + if at the start
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/[^\d+]/g, ''); // Remove everything except digits and +
    
    // If + was at start but got removed, add it back
    if (hasPlus && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    // Remove any + that's not at the start (shouldn't happen, but safety check)
    if (cleaned.includes('+') && !cleaned.startsWith('+')) {
      cleaned = cleaned.replace(/\+/g, '');
    }

    // Check if starts with + (international format)
    const isInternational = cleaned.startsWith('+');
    const digits = isInternational ? cleaned.slice(1) : cleaned;

    if (digits.length === 0) {
      throw new DomainException('Phone number must contain digits', {
        providedValue: phoneNumber,
      });
    }

    if (!PhoneNumber.DIGITS_ONLY_REGEX.test(digits)) {
      throw new DomainException('Phone number must contain only digits', {
        providedValue: phoneNumber,
        cleanedValue: cleaned,
      });
    }

    const totalLength = cleaned.length;

    if (totalLength < PhoneNumber.MIN_LENGTH) {
      throw new DomainException(
        `Phone number is too short (minimum ${PhoneNumber.MIN_LENGTH} digits)`,
        {
          providedValue: phoneNumber,
          cleanedValue: cleaned,
          length: totalLength,
        },
      );
    }

    if (totalLength > PhoneNumber.MAX_LENGTH) {
      throw new DomainException(
        `Phone number is too long (maximum ${PhoneNumber.MAX_LENGTH} digits)`,
        {
          providedValue: phoneNumber,
          cleanedValue: cleaned,
          length: totalLength,
        },
      );
    }

    return new PhoneNumber(cleaned);
  }

  /**
   * Gets the phone number as a string
   * 
   * @returns The phone number string (cleaned, no formatting)
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Formats the phone number for display
   * Formats as (XXX) XXX-XXXX for 10-digit US numbers
   * 
   * @returns Formatted phone number string
   */
  format(): string {
    const digits = this.value.replace(/^\+/, '');
    
    if (digits.length === 10) {
      // Format as (XXX) XXX-XXXX
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // For international numbers, just return with + prefix if it had one
    return this.value.startsWith('+') ? this.value : `+${this.value}`;
  }

  /**
   * Checks if the phone number is in international format
   * 
   * @returns true if phone number starts with +
   */
  isInternational(): boolean {
    return this.value.startsWith('+');
  }

  /**
   * Checks equality with another PhoneNumber value object
   * 
   * @param other - Another PhoneNumber value object
   * @returns true if phone numbers are equal
   */
  equals(other: PhoneNumber | null | undefined): boolean {
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
