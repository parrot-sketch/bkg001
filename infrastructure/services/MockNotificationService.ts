import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';

/**
 * Service: MockNotificationService
 * 
 * Mock implementation of INotificationService.
 * This service logs notification attempts without actually sending them.
 * 
 * This is useful for:
 * - Development and testing environments
 * - Staging environments where actual notifications are not desired
 * - Integration testing without external dependencies
 * 
 * In production, this would be replaced with:
 * - EmailNotificationService (using SendGrid, AWS SES, etc.)
 * - SMSNotificationService (using Twilio, AWS SNS, etc.)
 * 
 * Responsibilities:
 * - Log notification attempts
 * - NO business logic - only notification logging
 * 
 * Clean Architecture Rule: This class implements domain interface,
 * translating domain notification needs to infrastructure (console logging).
 */
export class MockNotificationService implements INotificationService {
  /**
   * Logs an email notification attempt without actually sending it
   * 
   * @param to - Recipient email address (as Email value object)
   * @param subject - Email subject line
   * @param body - Email body content (plain text or HTML)
   * @returns Promise that resolves immediately (no actual sending)
   * @throws Error if logging fails (unlikely)
   */
  async sendEmail(to: Email, subject: string, body: string): Promise<void> {
    try {
      const notificationLog = {
        type: 'email',
        timestamp: new Date().toISOString(),
        to: to.getValue(),
        subject,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''), // Truncate for logging
      };

      // Log as JSON for structured logging
      console.log(JSON.stringify(notificationLog));

      // Also log in human-readable format for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[NOTIFICATION] Email to ${to.getValue()}: ${subject}`);
      }
    } catch (error) {
      // Notification logging failures should not break the application
      console.error('Failed to log email notification:', error);
      throw new Error(`Failed to log email notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logs an SMS notification attempt without actually sending it
   * 
   * @param to - Recipient phone number (as PhoneNumber value object)
   * @param message - SMS message content
   * @returns Promise that resolves immediately (no actual sending)
   * @throws Error if logging fails (unlikely)
   */
  async sendSMS(to: PhoneNumber, message: string): Promise<void> {
    try {
      const notificationLog = {
        type: 'sms',
        timestamp: new Date().toISOString(),
        to: to.getValue(),
        message: message.substring(0, 160) + (message.length > 160 ? '...' : ''), // Truncate for logging
      };

      // Log as JSON for structured logging
      console.log(JSON.stringify(notificationLog));

      // Also log in human-readable format for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[NOTIFICATION] SMS to ${to.getValue()}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      }
    } catch (error) {
      // Notification logging failures should not break the application
      console.error('Failed to log SMS notification:', error);
      throw new Error(`Failed to log SMS notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logs an in-app notification attempt without actually creating it
   */
  async sendInApp(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error'): Promise<void> {
    try {
      const notificationLog = {
        type: 'in-app',
        timestamp: new Date().toISOString(),
        userId,
        title,
        message,
        level: type
      };
      console.log(JSON.stringify(notificationLog));
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[NOTIFICATION] In-App to ${userId}: [${type.toUpperCase()}] ${title} - ${message}`);
      }
    } catch (error) {
      console.error('Failed to log in-app notification:', error);
    }
  }
}
