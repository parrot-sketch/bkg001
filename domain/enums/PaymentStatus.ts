/**
 * Domain Enum: PaymentStatus
 * 
 * Represents the payment status of a bill.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PART = 'PART', // Partially paid
}

/**
 * Type guard to check if a string is a valid PaymentStatus
 */
export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

/**
 * Check if a payment status indicates full payment
 */
export function isFullyPaid(status: PaymentStatus): boolean {
  return status === PaymentStatus.PAID;
}

/**
 * Check if a payment status indicates outstanding balance
 */
export function hasOutstandingBalance(status: PaymentStatus): boolean {
  return status === PaymentStatus.UNPAID || status === PaymentStatus.PART;
}
