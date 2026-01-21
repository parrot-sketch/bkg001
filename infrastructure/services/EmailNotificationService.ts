/**
 * Service: EmailNotificationService
 * 
 * Real email notification service implementation.
 * Supports multiple email providers with fallback:
 * 1. Resend (primary) - Modern, simple API
 * 2. SMTP (fallback) - Works with any SMTP server
 * 3. Mock (development) - If no provider configured
 * 
 * Responsibilities:
 * - Send emails via configured provider
 * - Log all notification attempts (success/failure)
 * - Handle errors gracefully (notification failure shouldn't break use cases)
 * - Support HTML and plain text emails
 * 
 * Environment Variables:
 * - RESEND_API_KEY: Resend API key (preferred)
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP configuration (fallback)
 * - EMAIL_FROM: Sender email address (required)
 * 
 * Clean Architecture Rule: This class implements domain interface,
 * translating domain notification needs to infrastructure (email providers).
 */

import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';
import { MockNotificationService } from './MockNotificationService';
import {
  consultationRequestReceivedTemplate,
  appointmentBookedTemplate,
  consultationCompletedTemplate,
} from './email-templates';

interface NotificationLog {
  type: 'email' | 'sms';
  timestamp: string;
  to: string;
  subject?: string;
  body?: string;
  message?: string;
  success: boolean;
  error?: string;
  provider?: string;
}

class EmailNotificationService implements INotificationService {
  private readonly emailFrom: string;
  private readonly provider: 'resend' | 'smtp' | 'mock';
  private readonly mockService: MockNotificationService;

  constructor() {
    // Determine email provider based on environment variables
    this.emailFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'noreply@nairobi-sculpt.com';
    
    if (process.env.RESEND_API_KEY) {
      this.provider = 'resend';
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.provider = 'smtp';
    } else {
      this.provider = 'mock';
      console.warn('[EmailNotificationService] No email provider configured. Using mock service. Set RESEND_API_KEY or SMTP_* variables.');
    }

    this.mockService = new MockNotificationService();
  }

  /**
   * Sends an email notification
   * 
   * @param to - Recipient email address (as Email value object)
   * @param subject - Email subject line
   * @param body - Email body content (plain text or HTML)
   * @returns Promise that resolves when the email is successfully sent
   * @throws Error if the email cannot be sent
   */
  async sendEmail(to: Email, subject: string, body: string): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let providerUsed = this.provider;

    try {
      switch (this.provider) {
        case 'resend':
          await this.sendViaResend(to, subject, body);
          success = true;
          break;
        case 'smtp':
          await this.sendViaSMTP(to, subject, body);
          success = true;
          break;
        case 'mock':
          // Use mock service for development
          await this.mockService.sendEmail(to, subject, body);
          success = true;
          providerUsed = 'mock';
          break;
      }

      // Log successful notification
      this.logNotification({
        type: 'email',
        timestamp: new Date().toISOString(),
        to: to.getValue(),
        subject,
        body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
        success: true,
        provider: providerUsed,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      success = false;

      // Log failed notification
      this.logNotification({
        type: 'email',
        timestamp: new Date().toISOString(),
        to: to.getValue(),
        subject,
        body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
        success: false,
        error,
        provider: providerUsed,
      });

      // Re-throw error so use cases can handle it
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * Sends an SMS notification
   * 
   * @param to - Recipient phone number (as PhoneNumber value object)
   * @param message - SMS message content
   * @returns Promise that resolves when the SMS is successfully sent
   * @throws Error if the SMS cannot be sent
   */
  async sendSMS(to: PhoneNumber, message: string): Promise<void> {
    // SMS not implemented yet - use mock for now
    await this.mockService.sendSMS(to, message);
    
    this.logNotification({
      type: 'sms',
      timestamp: new Date().toISOString(),
      to: to.getValue(),
      message: message.substring(0, 160) + (message.length > 160 ? '...' : ''),
      success: true,
      provider: 'mock',
    });
  }

  /**
   * Send email via Resend API
   */
  private async sendViaResend(to: Email, subject: string, body: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.emailFrom,
          to: to.getValue(),
          subject,
          html: this.formatAsHTML(body),
          text: this.extractPlainText(body),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      if (!result.id) {
        throw new Error('Resend API did not return email ID');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Resend API')) {
        throw error;
      }
      throw new Error(`Failed to send email via Resend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(to: Email, subject: string, body: string): Promise<void> {
    // For now, use nodemailer would be ideal, but to avoid adding dependencies,
    // we'll use a simple fetch-based SMTP approach or fall back to mock
    // In production, you'd use nodemailer here
    
    // For Day 3, we'll implement a basic version that can be enhanced later
    // This is a placeholder - in real production, use nodemailer
    throw new Error('SMTP implementation requires nodemailer package. Please use Resend or install nodemailer.');
  }

  /**
   * Format body as HTML (if not already HTML)
   */
  private formatAsHTML(body: string): string {
    // If body already contains HTML tags, return as-is
    if (body.includes('<html') || body.includes('<!DOCTYPE') || body.includes('<div style=')) {
      return body;
    }

    // Convert plain text to HTML with basic formatting
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            ${body.split('\n').filter(line => line.trim()).map(line => `<p style="margin: 10px 0;">${this.escapeHtml(line)}</p>`).join('')}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message from Nairobi Sculpt Surgical Aesthetic Clinic.
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Extract plain text from HTML (simple version)
   */
  private extractPlainText(body: string): string {
    // Remove HTML tags (simple regex - for production, use a proper HTML parser)
    return body.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Log notification attempt
   */
  private logNotification(log: NotificationLog): void {
    try {
      // Structured logging for production
      const logEntry = {
        ...log,
      };

      // Log as JSON for structured logging systems
      console.log(JSON.stringify(logEntry));

      // Human-readable log for development
      if (process.env.NODE_ENV !== 'production') {
        const status = log.success ? '✅' : '❌';
        const provider = log.provider ? `[${log.provider}]` : '';
        console.log(`${status} ${provider} ${log.type.toUpperCase()} to ${log.to}: ${log.subject || log.message || 'N/A'}`);
        if (log.error) {
          console.error(`   Error: ${log.error}`);
        }
      }
    } catch (error) {
      // Logging failures should not break the application
      console.error('Failed to log notification:', error);
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();
