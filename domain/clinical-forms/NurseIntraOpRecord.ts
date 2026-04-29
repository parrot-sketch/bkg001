/**
 * Domain Model: Nursing Operation Record (Pre-op + Intra-op, 2 pages)
 * Nairobi Sculpt Aesthetic Centre
 *
 * Goal: Paper-form-perfect replica (no extra clinical fields in UI).
 *
 * Storage: JSON (no DB schema changes).
 * Inventory integration: optional hidden fields (inventoryItemId, quantityUsed).
 * Signatures: server-generated on finalization (data URLs), no client-side drawing.
 */

export * from './NurseIntraOpRecord.constants';
export * from './NurseIntraOpRecord.tables';
export * from './NurseIntraOpRecord.schemas';
export * from './NurseIntraOpRecord.ui';
export * from './NurseIntraOpRecord.helpers';

