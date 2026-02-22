import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Service: OtpService
 * 
 * Manages OTP (One-Time Password) generation, hashing, and validation.
 * 
 * Responsibilities:
 * - Generate random OTP codes
 * - Hash OTP codes for secure storage
 * - Validate OTP codes against hashed values
 * - Check OTP expiry
 */
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;

  /**
   * Generates a random 6-digit OTP code
   */
  generateOTP(): string {
    const randomNum = randomBytes(3).readUIntBE(0, 3);
    // Ensure 6 digits by padding with zeros if needed
    return String(randomNum % 1000000).padStart(6, '0');
  }

  /**
   * Hashes an OTP code for secure storage
   * 
   * @param otp - Plain text OTP code
   * @returns Promise resolving to hashed OTP
   */
  async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  /**
   * Validates an OTP code against a hashed value
   * 
   * @param otp - Plain text OTP code from user
   * @param hashedOtp - Hashed OTP stored in database
   * @returns Promise resolving to true if OTP matches, false otherwise
   */
  async validateOTP(otp: string, hashedOtp: string): Promise<boolean> {
    return bcrypt.compare(otp, hashedOtp);
  }

  /**
   * Calculates OTP expiry timestamp
   * 
   * @param minutes - Expiry time in minutes (default: 10)
   * @returns Date object representing expiry time
   */
  calculateExpiry(minutes: number = this.OTP_EXPIRY_MINUTES): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
  }

  /**
   * Checks if an OTP has expired
   * 
   * @param expiresAt - Expiry timestamp
   * @returns true if expired, false otherwise
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Gets the default OTP expiry time in minutes
   */
  getExpiryMinutes(): number {
    return this.OTP_EXPIRY_MINUTES;
  }
}
