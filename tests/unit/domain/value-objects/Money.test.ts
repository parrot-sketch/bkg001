import { describe, it, expect } from 'vitest';
import { Money } from '@domain/value-objects/Money';
import { DomainException } from '@domain/exceptions/DomainException';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create a valid money amount', () => {
      const money = Money.create(100.50);
      expect(money.getAmount()).toBe(100.5);
      expect(money.getCurrency()).toBe('USD');
    });

    it('should create money from string', () => {
      const money = Money.create('100.50');
      expect(money.getAmount()).toBe(100.5);
    });

    it('should round to 2 decimal places', () => {
      const money1 = Money.create(100.555);
      expect(money1.getAmount()).toBe(100.56); // Rounded up

      const money2 = Money.create(100.554);
      expect(money2.getAmount()).toBe(100.55); // Rounded down
    });

    it('should accept zero amount', () => {
      const money = Money.create(0);
      expect(money.getAmount()).toBe(0);
      expect(money.isZero()).toBe(true);
    });

    it('should accept custom currency', () => {
      const money = Money.create(100, 'EUR');
      expect(money.getCurrency()).toBe('EUR');
    });

    it('should normalize currency to uppercase', () => {
      const money = Money.create(100, 'usd');
      expect(money.getCurrency()).toBe('USD');
    });

    it('should reject negative amounts', () => {
      expect(() => Money.create(-100)).toThrow(DomainException);
      expect(() => Money.create(-0.01)).toThrow(DomainException);
    });

    it('should reject invalid number', () => {
      expect(() => Money.create(NaN)).toThrow(DomainException);
      expect(() => Money.create(Infinity)).toThrow(DomainException);
      expect(() => Money.create(-Infinity)).toThrow(DomainException);
      expect(() => Money.create('invalid' as any)).toThrow(DomainException);
    });

    it('should reject invalid currency', () => {
      expect(() => Money.create(100, '')).toThrow(DomainException);
      expect(() => Money.create(100, 'US')).toThrow(DomainException); // Too short
      expect(() => Money.create(100, 'USDD')).toThrow(DomainException); // Too long
      expect(() => Money.create(100, '123')).toThrow(DomainException); // Not letters
    });
  });

  describe('zero', () => {
    it('should create zero money with default currency', () => {
      const money = Money.zero();
      expect(money.getAmount()).toBe(0);
      expect(money.getCurrency()).toBe('USD');
      expect(money.isZero()).toBe(true);
    });

    it('should create zero money with custom currency', () => {
      const money = Money.zero('EUR');
      expect(money.getAmount()).toBe(0);
      expect(money.getCurrency()).toBe('EUR');
    });
  });

  describe('isZero', () => {
    it('should return true for zero amount', () => {
      const money = Money.create(0);
      expect(money.isZero()).toBe(true);
    });

    it('should return false for non-zero amount', () => {
      const money = Money.create(0.01);
      expect(money.isZero()).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when amount is greater', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);
      expect(money1.isGreaterThan(money2)).toBe(true);
    });

    it('should return false when amount is less', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);
      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it('should throw when currencies differ', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'EUR');
      expect(() => money1.isGreaterThan(money2)).toThrow(DomainException);
    });
  });

  describe('add', () => {
    it('should add two money amounts', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(150);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should throw when currencies differ', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'EUR');
      expect(() => money1.add(money2)).toThrow(DomainException);
    });

    it('should create new instance (immutability)', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);
      const result = money1.add(money2);
      expect(result).not.toBe(money1);
      expect(money1.getAmount()).toBe(100); // Original unchanged
    });
  });

  describe('subtract', () => {
    it('should subtract two money amounts', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(30);
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(70);
    });

    it('should throw when result would be negative', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);
      expect(() => money1.subtract(money2)).toThrow(DomainException);
    });

    it('should throw when currencies differ', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'EUR');
      expect(() => money1.subtract(money2)).toThrow(DomainException);
    });
  });

  describe('multiply', () => {
    it('should multiply money by factor', () => {
      const money = Money.create(100);
      const result = money.multiply(2);
      expect(result.getAmount()).toBe(200);
    });

    it('should handle decimal factor', () => {
      const money = Money.create(100);
      const result = money.multiply(1.5);
      expect(result.getAmount()).toBe(150);
    });

    it('should reject negative factor', () => {
      const money = Money.create(100);
      expect(() => money.multiply(-1)).toThrow(DomainException);
    });
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      const money = Money.create(100);
      const result = money.applyDiscount(10); // 10% discount
      expect(result.getAmount()).toBe(90);
    });

    it('should handle 0% discount', () => {
      const money = Money.create(100);
      const result = money.applyDiscount(0);
      expect(result.getAmount()).toBe(100);
    });

    it('should handle 100% discount', () => {
      const money = Money.create(100);
      const result = money.applyDiscount(100);
      expect(result.getAmount()).toBe(0);
    });

    it('should reject negative percentage', () => {
      const money = Money.create(100);
      expect(() => money.applyDiscount(-10)).toThrow(DomainException);
    });

    it('should reject percentage over 100', () => {
      const money = Money.create(100);
      expect(() => money.applyDiscount(150)).toThrow(DomainException);
    });
  });

  describe('format', () => {
    it('should format USD money with $ symbol', () => {
      const money = Money.create(100.50);
      expect(money.format()).toBe('$100.50');
    });

    it('should format other currencies with currency code', () => {
      const money = Money.create(100.50, 'EUR');
      expect(money.format()).toBe('100.50 EUR');
    });
  });

  describe('equals', () => {
    it('should return true for equal amounts and currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'USD');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(200, 'USD');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'EUR');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const money = Money.create(100);
      expect(money.equals(null)).toBe(false);
      expect(money.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const money = Money.create(100.50);
      expect(money.toString()).toBe('$100.50');
    });
  });
});
