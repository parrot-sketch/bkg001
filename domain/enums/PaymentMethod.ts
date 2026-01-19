/**
 * Domain Enum: PaymentMethod
 * 
 * Represents the method used for payment.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
}

/**
 * Type guard to check if a string is a valid PaymentMethod
 */
export function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

/**
 * Get all valid payment method values
 */
export function getAllPaymentMethods(): readonly PaymentMethod[] {
  return Object.values(PaymentMethod);
}
