import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: Money
 * 
 * Represents a monetary amount with currency.
 * Immutable and validated upon construction.
 * 
 * Business Rules:
 * - Amount must be non-negative (we don't allow negative money in healthcare billing)
 * - Amount must be a valid number
 * - Currency must be a valid ISO 4217 code (defaults to USD)
 * - Precision is limited to 2 decimal places (cents)
 * 
 * Note: This implementation uses USD as default currency.
 * Multi-currency support can be added later if needed.
 */
export class Money {
  private static readonly DEFAULT_CURRENCY = 'USD';
  private static readonly MAX_DECIMAL_PLACES = 2;

  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {
    // Values are set in factory method after validation
  }

  /**
   * Creates a Money value object from an amount and optional currency
   * 
   * @param amount - The monetary amount (will be rounded to 2 decimal places)
   * @param currency - Optional currency code (defaults to USD)
   * @returns Money value object
   * @throws DomainException if amount is invalid
   */
  static create(amount: number | string, currency: string = Money.DEFAULT_CURRENCY): Money {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      throw new DomainException('Money amount must be a valid number', {
        providedValue: amount,
      });
    }

    if (!isFinite(numAmount)) {
      throw new DomainException('Money amount must be finite', {
        providedValue: amount,
      });
    }

    if (numAmount < 0) {
      throw new DomainException('Money amount cannot be negative', {
        providedValue: amount,
      });
    }

    // Round to 2 decimal places (cents)
    const rounded = Math.round(numAmount * 100) / 100;

    if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
      throw new DomainException('Currency code cannot be empty', {
        providedValue: currency,
      });
    }

    const normalizedCurrency = currency.trim().toUpperCase();

    // Basic currency validation (must be 3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new DomainException('Currency code must be a valid 3-letter ISO code', {
        providedValue: currency,
        normalizedValue: normalizedCurrency,
      });
    }

    return new Money(rounded, normalizedCurrency);
  }

  /**
   * Creates a Money value object representing zero amount
   * 
   * @param currency - Optional currency code (defaults to USD)
   * @returns Money value object with zero amount
   */
  static zero(currency: string = Money.DEFAULT_CURRENCY): Money {
    return Money.create(0, currency);
  }

  /**
   * Gets the monetary amount
   * 
   * @returns The amount as a number (always rounded to 2 decimal places)
   */
  getAmount(): number {
    return this.amount;
  }

  /**
   * Gets the currency code
   * 
   * @returns The currency code (e.g., "USD")
   */
  getCurrency(): string {
    return this.currency;
  }

  /**
   * Checks if the amount is zero
   * 
   * @returns true if amount is zero
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Checks if the amount is greater than another Money value
   * 
   * @param other - Another Money value object
   * @returns true if this amount is greater
   * @throws DomainException if currencies don't match
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  /**
   * Checks if the amount is less than another Money value
   * 
   * @param other - Another Money value object
   * @returns true if this amount is less
   * @throws DomainException if currencies don't match
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  /**
   * Adds another Money value to this one
   * 
   * @param other - Another Money value object to add
   * @returns New Money value object with the sum
   * @throws DomainException if currencies don't match
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  /**
   * Subtracts another Money value from this one
   * 
   * @param other - Another Money value object to subtract
   * @returns New Money value object with the difference
   * @throws DomainException if currencies don't match or result would be negative
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    
    if (result < 0) {
      throw new DomainException('Money subtraction would result in negative amount', {
        thisAmount: this.amount,
        otherAmount: other.amount,
        result,
      });
    }
    
    return Money.create(result, this.currency);
  }

  /**
   * Multiplies this Money value by a factor
   * 
   * @param factor - The multiplication factor
   * @returns New Money value object with the product
   * @throws DomainException if factor is negative
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new DomainException('Multiplication factor cannot be negative', {
        factor,
      });
    }
    return Money.create(this.amount * factor, this.currency);
  }

  /**
   * Applies a percentage discount
   * 
   * @param percentage - The discount percentage (0-100)
   * @returns New Money value object with discount applied
   * @throws DomainException if percentage is invalid
   */
  applyDiscount(percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new DomainException('Discount percentage must be between 0 and 100', {
        percentage,
      });
    }
    const discountAmount = this.amount * (percentage / 100);
    return this.subtract(Money.create(discountAmount, this.currency));
  }

  /**
   * Formats the money for display
   * 
   * @returns Formatted string (e.g., "$100.50" or "100.50 USD")
   */
  format(): string {
    if (this.currency === 'USD') {
      return `$${this.amount.toFixed(Money.MAX_DECIMAL_PLACES)}`;
    }
    return `${this.amount.toFixed(Money.MAX_DECIMAL_PLACES)} ${this.currency}`;
  }

  /**
   * Checks equality with another Money value object
   * 
   * @param other - Another Money value object
   * @returns true if amounts and currencies are equal
   */
  equals(other: Money | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.amount === other.amount && this.currency === other.currency;
  }

  /**
   * Asserts that another Money value has the same currency
   * 
   * @param other - Another Money value object
   * @throws DomainException if currencies don't match
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot operate on Money values with different currencies', {
        thisCurrency: this.currency,
        otherCurrency: other.currency,
      });
    }
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return this.format();
  }
}
