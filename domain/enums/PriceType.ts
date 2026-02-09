/**
 * PriceType Enum
 * 
 * Determines how a service's price is applied during billing.
 * FIXED: Non-negotiable standard rate.
 * VARIABLE: Price can be adjusted within min/max bounds.
 * PER_UNIT: Price is multiplied by quantity (e.g., per ml, per session).
 * QUOTE_REQUIRED: Price determined on a case-by-case basis.
 */
export enum PriceType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
  PER_UNIT = 'PER_UNIT',
  QUOTE_REQUIRED = 'QUOTE_REQUIRED',
}
