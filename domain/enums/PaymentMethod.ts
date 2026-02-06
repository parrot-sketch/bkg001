/**
 * Domain Enum: PaymentMethod
 * 
 * Supported payment methods at the facility.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
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

/**
 * Helper: Get display label for payment method
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Cash',
    [PaymentMethod.CARD]: 'Card',
    [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
    [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  };
  return labels[method] || method;
}
