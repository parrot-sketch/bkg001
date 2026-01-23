import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INotificationService } from '@domain/interfaces/services/INotificationService';
import { Email } from '@domain/value-objects/Email';
import { PhoneNumber } from '@domain/value-objects/PhoneNumber';

/**
 * Test: INotificationService Interface
 * 
 * These tests validate that:
 * 1. The interface contract is correct
 * 2. The interface can be implemented (mock implementation)
 * 3. The interface methods have correct signatures
 * 4. The interface is usable in a mock-driven environment
 */
describe('INotificationService Interface', () => {
  /**
   * Mock implementation for testing
   * This validates that the interface contract can be satisfied
   */
  class MockNotificationService implements INotificationService {
    async sendEmail(to: Email, subject: string, body: string): Promise<void> {
      // Mock implementation - just logs for testing
      if (!to || !subject || !body) {
        throw new Error('Invalid email parameters');
      }
    }

    async sendSMS(to: PhoneNumber, message: string): Promise<void> {
      // Mock implementation - just logs for testing
      if (!to || !message) {
        throw new Error('Invalid SMS parameters');
      }
    }
  }

  describe('Interface Contract', () => {
    it('should be implementable', () => {
      const service: INotificationService = new MockNotificationService();
      expect(service).toBeDefined();
    });

    it('should have sendEmail method with correct signature', () => {
      const service: INotificationService = new MockNotificationService();
      expect(typeof service.sendEmail).toBe('function');
      expect(service.sendEmail.length).toBe(3); // Takes 3 parameters
    });

    it('should have sendSMS method with correct signature', () => {
      const service: INotificationService = new MockNotificationService();
      expect(typeof service.sendSMS).toBe('function');
      expect(service.sendSMS.length).toBe(2); // Takes 2 parameters
    });
  });

  describe('Mock Implementation Behavior', () => {
    let service: MockNotificationService;

    beforeEach(() => {
      service = new MockNotificationService();
    });

    it('should send email successfully', async () => {
      const email = Email.create('test@example.com');
      await expect(service.sendEmail(email, 'Subject', 'Body')).resolves.not.toThrow();
    });

    it('should send SMS successfully', async () => {
      const phone = PhoneNumber.create('1234567890');
      await expect(service.sendSMS(phone, 'Message')).resolves.not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should accept Email value object for sendEmail', () => {
      const service: INotificationService = new MockNotificationService();
      const email = Email.create('test@example.com');

      // This should compile without errors
      const result: Promise<void> = service.sendEmail(email, 'Subject', 'Body');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should accept PhoneNumber value object for sendSMS', () => {
      const service: INotificationService = new MockNotificationService();
      const phone = PhoneNumber.create('1234567890');

      // This should compile without errors
      const result: Promise<void> = service.sendSMS(phone, 'Message');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should require string for email subject and body', () => {
      const service: INotificationService = new MockNotificationService();
      const email = Email.create('test@example.com');

      // These should compile
      service.sendEmail(email, 'Subject', 'Body');
    });

    it('should require string for SMS message', () => {
      const service: INotificationService = new MockNotificationService();
      const phone = PhoneNumber.create('1234567890');

      // This should compile
      service.sendSMS(phone, 'Message');
    });
  });

  describe('Mock-Driven Environment Usage', () => {
    it('should be usable with Vitest mocks', () => {
      const mockService: INotificationService = {
        sendEmail: vi.fn().mockResolvedValue(undefined),
        sendSMS: vi.fn().mockResolvedValue(undefined),
      };

      expect(mockService.sendEmail).toBeDefined();
      expect(mockService.sendSMS).toBeDefined();
    });

    it('should allow setting mock return values', async () => {
      const email = Email.create('test@example.com');
      const phone = PhoneNumber.create('1234567890');
      const mockService: INotificationService = {
        sendEmail: vi.fn().mockResolvedValue(undefined),
        sendSMS: vi.fn().mockResolvedValue(undefined),
      };

      await mockService.sendEmail(email, 'Subject', 'Body');
      expect(mockService.sendEmail).toHaveBeenCalledWith(email, 'Subject', 'Body');

      await mockService.sendSMS(phone, 'Message');
      expect(mockService.sendSMS).toHaveBeenCalledWith(phone, 'Message');
    });

    it('should allow mocking errors', async () => {
      const email = Email.create('test@example.com');
      const phone = PhoneNumber.create('1234567890');
      const mockService: INotificationService = {
        sendEmail: vi.fn().mockRejectedValue(new Error('Email send failed')),
        sendSMS: vi.fn().mockRejectedValue(new Error('SMS send failed')),
      };

      await expect(mockService.sendEmail(email, 'Subject', 'Body')).rejects.toThrow();
      await expect(mockService.sendSMS(phone, 'Message')).rejects.toThrow();
    });
  });
});
