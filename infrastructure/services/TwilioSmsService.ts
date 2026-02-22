import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';

/**
 * Service: TwilioSmsService
 * 
 * Infrastructure service for sending SMS messages via Twilio.
 * 
 * Responsibilities:
 * - Send SMS messages using Twilio API
 * - Handle Twilio-specific errors
 * - No business logic - pure infrastructure concern
 * 
 * Clean Architecture Rule: This class implements infrastructure concerns,
 * translating domain notification needs to Twilio API calls.
 */
export class TwilioSmsService {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly client: any; // Twilio client (lazy-loaded to avoid import errors if package not installed)

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[TwilioSmsService] Twilio credentials not configured. SMS sending will fail.');
    }
  }

  /**
   * Lazy-load Twilio client to avoid import errors if package not installed
   */
  private getTwilioClient(): any {
    try {
      // Dynamic import to handle case where twilio package is not installed
      const twilio = require('twilio');
      return twilio(this.accountSid, this.authToken);
    } catch (error) {
      throw new Error('Twilio package not installed. Run: pnpm add twilio');
    }
  }

  /**
   * Sends an SMS message via Twilio
   * 
   * @param to - Recipient phone number (as PhoneNumber value object)
   * @param message - SMS message content
   * @returns Promise that resolves when SMS is successfully sent
   * @throws Error if SMS cannot be sent
   */
  async sendSMS(to: PhoneNumber, message: string): Promise<void> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
    }

    try {
      const client = this.getTwilioClient();
      const phoneNumber = to.getValue();

      await client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      console.log(`[TwilioSmsService] SMS sent successfully to ${phoneNumber}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TwilioSmsService] Failed to send SMS to ${to.getValue()}:`, errorMessage);
      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
  }

  /**
   * Sends an OTP code via SMS
   * 
   * @param to - Recipient phone number
   * @param code - OTP code (6 digits)
   * @param expiresInMinutes - OTP expiry time in minutes (default: 10)
   * @returns Promise that resolves when OTP SMS is sent
   */
  async sendOTP(to: PhoneNumber, code: string, expiresInMinutes: number = 10): Promise<void> {
    const message = `Your consent verification code is: ${code}. Valid for ${expiresInMinutes} minutes.`;
    await this.sendSMS(to, message);
  }
}
