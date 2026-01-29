import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';

describe('MockNotificationService', () => {
  let service: MockNotificationService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new MockNotificationService();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    // Set NODE_ENV to test to avoid production logging format
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendEmail', () => {
    it('should log email notification as JSON', async () => {
      const email = Email.create('test@example.com');
      const subject = 'Test Subject';
      const body = 'Test email body';

      await service.sendEmail(email, subject, body);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.type).toBe('email');
      expect(parsedLog.to).toBe('test@example.com');
      expect(parsedLog.subject).toBe('Test Subject');
      expect(parsedLog.body).toBe('Test email body');
      expect(parsedLog.timestamp).toBeDefined();
    });

    it('should truncate long email body in log', async () => {
      const email = Email.create('test@example.com');
      const subject = 'Test Subject';
      const body = 'A'.repeat(200); // 200 characters

      await service.sendEmail(email, subject, body);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.body.length).toBeLessThanOrEqual(103); // 100 chars + "..."
      expect(parsedLog.body.endsWith('...')).toBe(true);
    });

    it('should throw error if logging fails', async () => {
      const email = Email.create('test@example.com');
      const subject = 'Test Subject';
      const body = 'Test body';

      // Force console.log to throw an error
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      await expect(service.sendEmail(email, subject, body)).rejects.toThrow(
        'Failed to log email notification'
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include timestamp in log', async () => {
      const email = Email.create('test@example.com');
      const subject = 'Test Subject';
      const body = 'Test body';

      const beforeTime = new Date().toISOString();
      await service.sendEmail(email, subject, body);
      const afterTime = new Date().toISOString();

      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.timestamp).toBeDefined();
      expect(new Date(parsedLog.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(parsedLog.timestamp).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('sendSMS', () => {
    it('should log SMS notification as JSON', async () => {
      const phone = PhoneNumber.create('1234567890');
      const message = 'Test SMS message';

      await service.sendSMS(phone, message);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.type).toBe('sms');
      expect(parsedLog.to).toBe('1234567890');
      expect(parsedLog.message).toBe('Test SMS message');
      expect(parsedLog.timestamp).toBeDefined();
    });

    it('should truncate long SMS message in log', async () => {
      const phone = PhoneNumber.create('1234567890');
      const message = 'A'.repeat(200); // 200 characters

      await service.sendSMS(phone, message);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.message.length).toBeLessThanOrEqual(163); // 160 chars + "..."
      expect(parsedLog.message.endsWith('...')).toBe(true);
    });

    it('should throw error if logging fails', async () => {
      const phone = PhoneNumber.create('1234567890');
      const message = 'Test message';

      // Force console.log to throw an error
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      await expect(service.sendSMS(phone, message)).rejects.toThrow(
        'Failed to log SMS notification'
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include timestamp in log', async () => {
      const phone = PhoneNumber.create('1234567890');
      const message = 'Test message';

      const beforeTime = new Date().toISOString();
      await service.sendSMS(phone, message);
      const afterTime = new Date().toISOString();

      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.timestamp).toBeDefined();
      expect(new Date(parsedLog.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(parsedLog.timestamp).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });
});
