/**
 * BillType Enum
 * 
 * Classifies payment records by their source context.
 * Enables filtering and reporting across consultation, surgery, and other billing flows.
 */
export enum BillType {
  CONSULTATION = 'CONSULTATION',
  SURGERY = 'SURGERY',
  LAB_TEST = 'LAB_TEST',
  FOLLOW_UP = 'FOLLOW_UP',
  OTHER = 'OTHER',
}
