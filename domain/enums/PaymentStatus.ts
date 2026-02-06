/**
 * Payment Status Enum
 * 
 * Represents the lifecycle states of a payment/bill.
 * 
 * Workflow:
 * - UNPAID: Bill created but no payment received
 * - PART: Partial payment received
 * - PAID: Full payment received
 * 
 * Business Rules:
 * - Consultation completion creates bill with UNPAID status
 * - Frontdesk collects payment and updates status
 * - Receipt generated only after PAID status
 */
export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PART = 'PART',
  PAID = 'PAID',
}

/**
 * Helper: Get display label for payment status
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    [PaymentStatus.UNPAID]: 'Unpaid',
    [PaymentStatus.PART]: 'Partial',
    [PaymentStatus.PAID]: 'Paid',
  };
  return labels[status] || status;
}

/**
 * Check if payment is complete
 */
export function isPaymentComplete(status: PaymentStatus): boolean {
  return status === PaymentStatus.PAID;
}

/**
 * Check if payment has any amount received
 */
export function hasPartialPayment(status: PaymentStatus): boolean {
  return status === PaymentStatus.PART || status === PaymentStatus.PAID;
}
