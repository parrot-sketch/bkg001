import { describe, it, expect } from 'vitest';
import { PhoneNumber } from '@domain/value-objects/PhoneNumber';
import { DomainException } from '@domain/exceptions/DomainException';

describe('PhoneNumber Value Object', () => {
  describe('create', () => {
    it('should create a valid phone number', () => {
      const phone = PhoneNumber.create('1234567890');
      expect(phone.getValue()).toBe('1234567890');
    });

    it('should remove formatting characters', () => {
      const phone1 = PhoneNumber.create('(123) 456-7890');
      expect(phone1.getValue()).toBe('1234567890');

      const phone2 = PhoneNumber.create('123-456-7890');
      expect(phone2.getValue()).toBe('1234567890');

      const phone3 = PhoneNumber.create('123.456.7890');
      expect(phone3.getValue()).toBe('1234567890');
    });

    it('should handle international format', () => {
      const phone = PhoneNumber.create('+11234567890');
      expect(phone.getValue()).toBe('+11234567890');
      expect(phone.isInternational()).toBe(true);
    });

    it('should reject empty string', () => {
      expect(() => PhoneNumber.create('')).toThrow(DomainException);
      expect(() => PhoneNumber.create('   ')).toThrow(DomainException);
    });

    it('should reject null or undefined', () => {
      expect(() => PhoneNumber.create(null as any)).toThrow(DomainException);
      expect(() => PhoneNumber.create(undefined as any)).toThrow(DomainException);
    });

    it('should reject phone number that is too short', () => {
      expect(() => PhoneNumber.create('123456789')).toThrow(DomainException); // 9 digits
      expect(() => PhoneNumber.create('123')).toThrow(DomainException);
    });

    it('should reject phone number that is too long', () => {
      const longPhone = '1'.repeat(16); // 16 digits
      expect(() => PhoneNumber.create(longPhone)).toThrow(DomainException);
    });

    it('should reject phone number with non-digit characters', () => {
      expect(() => PhoneNumber.create('123456789a')).toThrow(DomainException);
      expect(() => PhoneNumber.create('abc1234567')).toThrow(DomainException);
    });

    it('should accept minimum length phone number', () => {
      const phone = PhoneNumber.create('1234567890'); // Exactly 10 digits
      expect(phone.getValue()).toBe('1234567890');
    });

    it('should accept maximum length phone number', () => {
      const phone = PhoneNumber.create('123456789012345'); // Exactly 15 digits
      expect(phone.getValue()).toBe('123456789012345');
    });
  });

  describe('format', () => {
    it('should format 10-digit US number', () => {
      const phone = PhoneNumber.create('1234567890');
      expect(phone.format()).toBe('(123) 456-7890');
    });

    it('should format international number with + prefix', () => {
      const phone = PhoneNumber.create('+11234567890');
      expect(phone.format()).toBe('+11234567890');
    });

    it('should add + prefix for non-US numbers', () => {
      const phone = PhoneNumber.create('12345678901234'); // 14 digits
      expect(phone.format()).toBe('+12345678901234');
    });
  });

  describe('isInternational', () => {
    it('should return true for international format', () => {
      const phone = PhoneNumber.create('+11234567890');
      expect(phone.isInternational()).toBe(true);
    });

    it('should return false for domestic format', () => {
      const phone = PhoneNumber.create('1234567890');
      expect(phone.isInternational()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal phone numbers', () => {
      const phone1 = PhoneNumber.create('1234567890');
      const phone2 = PhoneNumber.create('(123) 456-7890');
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should return false for different phone numbers', () => {
      const phone1 = PhoneNumber.create('1234567890');
      const phone2 = PhoneNumber.create('9876543210');
      expect(phone1.equals(phone2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const phone = PhoneNumber.create('1234567890');
      expect(phone.equals(null)).toBe(false);
      expect(phone.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return phone number string value', () => {
      const phone = PhoneNumber.create('1234567890');
      expect(phone.toString()).toBe('1234567890');
    });
  });
});
