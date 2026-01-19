import { describe, it, expect } from 'vitest';
import { Email } from '@domain/value-objects/Email';
import { DomainException } from '@domain/exceptions/DomainException';

describe('Email Value Object', () => {
  describe('create', () => {
    it('should create a valid email', () => {
      const email = Email.create('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = Email.create('Test@Example.COM');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      const email = Email.create('  test@example.com  ');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should reject empty string', () => {
      expect(() => Email.create('')).toThrow(DomainException);
      expect(() => Email.create('   ')).toThrow(DomainException);
    });

    it('should reject null or undefined', () => {
      expect(() => Email.create(null as any)).toThrow(DomainException);
      expect(() => Email.create(undefined as any)).toThrow(DomainException);
    });

    it('should reject invalid email format', () => {
      expect(() => Email.create('invalid')).toThrow(DomainException);
      expect(() => Email.create('invalid@')).toThrow(DomainException);
      expect(() => Email.create('@example.com')).toThrow(DomainException);
      expect(() => Email.create('test@')).toThrow(DomainException);
      expect(() => Email.create('test@.com')).toThrow(DomainException);
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(245) + '@example.com'; // 254+ characters
      expect(() => Email.create(longEmail)).toThrow(DomainException);
    });

    it('should accept maximum length email', () => {
      const maxEmail = 'a'.repeat(244) + '@example.com'; // Exactly 254 characters
      const email = Email.create(maxEmail);
      expect(email.getValue()).toBe(maxEmail.toLowerCase());
    });
  });

  describe('getDomain', () => {
    it('should extract domain from email', () => {
      const email = Email.create('user@example.com');
      expect(email.getDomain()).toBe('example.com');
    });

    it('should handle subdomain in email', () => {
      const email = Email.create('user@mail.example.com');
      expect(email.getDomain()).toBe('mail.example.com');
    });
  });

  describe('getLocalPart', () => {
    it('should extract local part from email', () => {
      const email = Email.create('user@example.com');
      expect(email.getLocalPart()).toBe('user');
    });

    it('should handle plus addressing in email', () => {
      const email = Email.create('user+tag@example.com');
      expect(email.getLocalPart()).toBe('user+tag');
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = Email.create('test@example.com');
      const email2 = Email.create('TEST@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = Email.create('test1@example.com');
      const email2 = Email.create('test2@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const email = Email.create('test@example.com');
      expect(email.equals(null)).toBe(false);
      expect(email.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return email string value', () => {
      const email = Email.create('test@example.com');
      expect(email.toString()).toBe('test@example.com');
    });
  });
});
