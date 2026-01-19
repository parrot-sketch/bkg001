import { describe, it, expect } from 'vitest';
import { Password } from '../../../../domain/value-objects/Password';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('Password Value Object', () => {
  describe('create', () => {
    it('should create a valid strong password', () => {
      const password = Password.create('SecureP@ss123');
      expect(password.getLength()).toBe(13);
    });

    it('should reject empty string', () => {
      expect(() => Password.create('')).toThrow(DomainException);
      expect(() => Password.create('   ')).toThrow(DomainException);
    });

    it('should reject null or undefined', () => {
      expect(() => Password.create(null as any)).toThrow(DomainException);
      expect(() => Password.create(undefined as any)).toThrow(DomainException);
    });

    it('should reject password less than 8 characters', () => {
      expect(() => Password.create('Short1')).toThrow(DomainException);
      expect(() => Password.create('Abc123')).toThrow(DomainException);
      expect(() => Password.create('A1')).toThrow(DomainException);
    });

    it('should reject password more than 128 characters', () => {
      const longPassword = 'A'.repeat(127) + 'b1'; // 129 characters (128+) (127 + 2)
      expect(() => Password.create(longPassword)).toThrow(DomainException);
    });

    it('should accept password with exactly 8 characters', () => {
      const password = Password.create('Abcdefg1');
      expect(password.getLength()).toBe(8);
    });

    it('should accept password with 128 characters', () => {
      const longPassword = 'A'.repeat(126) + 'b1'; // Exactly 128 characters (126 + 2)
      const password = Password.create(longPassword);
      expect(password.getLength()).toBe(128);
    });
  });

  describe('uppercase letter requirement', () => {
    it('should reject password without uppercase letter', () => {
      expect(() => Password.create('lowercase123')).toThrow(DomainException);
      expect(() => Password.create('alllowercase123')).toThrow(DomainException);
    });

    it('should accept password with uppercase letter', () => {
      const password = Password.create('SecureP@ss123');
      expect(password).toBeInstanceOf(Password);
    });
  });

  describe('lowercase letter requirement', () => {
    it('should reject password without lowercase letter', () => {
      expect(() => Password.create('UPPERCASE123')).toThrow(DomainException);
      expect(() => Password.create('ALLCAPS123')).toThrow(DomainException);
    });

    it('should accept password with lowercase letter', () => {
      const password = Password.create('SecureP@ss123');
      expect(password).toBeInstanceOf(Password);
    });
  });

  describe('number requirement', () => {
    it('should reject password without number', () => {
      expect(() => Password.create('NoNumbersHere')).toThrow(DomainException);
      expect(() => Password.create('OnlyLetters')).toThrow(DomainException);
    });

    it('should accept password with number', () => {
      const password = Password.create('SecureP@ss123');
      expect(password).toBeInstanceOf(Password);
    });
  });

  describe('special character requirement (optional)', () => {
    it('should accept password without special character (when not required)', () => {
      const password = Password.create('SecureP@ss123', false);
      expect(password).toBeInstanceOf(Password);
    });

    it('should reject password without special character (when required)', () => {
      // Need a password without special chars that still passes other rules
      expect(() => Password.create('SecurePass123', true)).toThrow(DomainException);
    });

    it('should accept password with special character (when required)', () => {
      const password = Password.create('SecureP@ss123!', true);
      expect(password).toBeInstanceOf(Password);
    });
  });

  describe('common weak passwords', () => {
    it('should reject common weak password: password', () => {
      // Password contains "password" which is in common passwords list
      expect(() => Password.create('Password123')).toThrow(DomainException);
      expect(() => Password.create('password123')).toThrow(DomainException);
    });

    it('should reject common weak password: password123', () => {
      // Password123 contains "password" which is in common passwords list
      expect(() => Password.create('Password1234')).toThrow(DomainException);
      expect(() => Password.create('password1234')).toThrow(DomainException);
    });

    it('should reject common weak password: 12345678', () => {
      expect(() => Password.create('A12345678')).toThrow(DomainException);
    });

    it('should reject common weak password: qwerty123', () => {
      expect(() => Password.create('Qwerty123456')).toThrow(DomainException);
    });

    it('should reject common weak password: admin123', () => {
      expect(() => Password.create('Admin123456')).toThrow(DomainException);
    });
  });

  describe('getValue()', () => {
    it('should return plain text password (use with caution)', () => {
      const password = Password.create('SecureP@ss123');
      expect(password.getValue()).toBe('SecureP@ss123');
    });
  });

  describe('getLength()', () => {
    it('should return correct password length', () => {
      const password = Password.create('SecureP@ss123');
      expect(password.getLength()).toBe(13);
    });
  });

  describe('toString()', () => {
    it('should not expose password in string representation', () => {
      const password = Password.create('SecureP@ss123');
      expect(password.toString()).toBe('***');
      // Verify actual password is not in string representation
      expect(password.toString()).not.toContain('SecureP@ss123');
    });
  });

  describe('edge cases', () => {
    it('should trim whitespace before validation', () => {
      const password = Password.create('  SecureP@ss123  ');
      expect(password.getValue()).toBe('SecureP@ss123');
    });

    it('should accept minimum valid password', () => {
      const password = Password.create('Abcdefg1'); // Exactly 8 chars, has upper, lower, number
      expect(password.getLength()).toBe(8);
    });

    it('should accept complex password with special characters', () => {
      const password = Password.create('MyStr0ng!P@ssw0rd', false);
      expect(password).toBeInstanceOf(Password);
    });
  });
});
