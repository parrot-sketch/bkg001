import { Email } from '../../value-objects/Email';
import { PhoneNumber } from '../../value-objects/PhoneNumber';

/**
 * Service Interface: INotificationService
 * 
 * Defines the contract for sending notifications to users.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., EmailNotificationService using SendGrid, SMSNotificationService using Twilio).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface INotificationService {
  /**
   * Sends an email notification
   * 
   * @param to - Recipient email address (as Email value object)
   * @param subject - Email subject line
   * @param body - Email body content (plain text or HTML)
   * @returns Promise that resolves when the email is successfully sent
   * @throws Error if the email cannot be sent
   */
  sendEmail(to: Email, subject: string, body: string): Promise<void>;

  /**
   * Sends an SMS notification
   * 
   * @param to - Recipient phone number (as PhoneNumber value object)
   * @param message - SMS message content
   * @returns Promise that resolves when the SMS is successfully sent
   * @throws Error if the SMS cannot be sent
   */
  sendSMS(to: PhoneNumber, message: string): Promise<void>;
}
