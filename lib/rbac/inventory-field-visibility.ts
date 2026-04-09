/**
 * RBAC: Field-Level Access Control for Inventory Items
 *
 * Defines which fields each role can view in inventory responses.
 * Field filtering MUST occur server-side before returning data.
 */

import { Role } from '@/domain/enums/Role';
import type { InventoryItem } from '@/domain/interfaces/repositories/IInventoryRepository';

/**
 * Define allowed fields for each role
 *
 * Fields are organized by sensitivity:
 * - Public: always visible
 * - Operational: visible to roles that manage inventory operations
 * - Sensitive/Pricing: restricted to procurement/admin roles
 * - Administrative: restricted to admin
 */
export const FIELD_VISIBILITY_MAP: Record<Role, (keyof InventoryItem)[]> = {
  // Admin: Full access to all fields
  [Role.ADMIN]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'unitCost',
    'reorderPoint',
    'lowStockThreshold',
    'supplier',
    'manufacturer',
    'isActive',
    'isBillable',
    'isImplant',
    'createdAt',
    'updatedAt',
  ],

  // Stores: Inventory management access (procurement equivalent)
  // Can see pricing and reorder information
  [Role.STORES]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'unitCost',
    'reorderPoint',
    'lowStockThreshold',
    'supplier',
    'manufacturer',
    'isActive',
    'isBillable',
    'isImplant',
    'createdAt',
    'updatedAt',
  ],

  // Doctor: Clinical access + billing fields for consultation billing
  [Role.DOCTOR]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'isActive',
    'isBillable',
    'isImplant',
  ],

  // Nurse: Clinical access, NO pricing info
  [Role.NURSE]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'isActive',
    'isBillable',
    'isImplant',
  ],

  // Theater Technician: Can see items, billing status, NO pricing
  [Role.THEATER_TECHNICIAN]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'isActive',
    'isBillable',
    'isImplant',
  ],

  // FrontDesk: Very limited access, basic inventory info only
  [Role.FRONTDESK]: [
    'id',
    'name',
    'category',
    'isActive',
  ],

  // Lab Technician: Limited access similar to clinical staff
  [Role.LAB_TECHNICIAN]: [
    'id',
    'name',
    'sku',
    'category',
    'description',
    'unitOfMeasure',
    'isActive',
  ],

  // Cashier: Basic info for billing purposes
  [Role.CASHIER]: [
    'id',
    'name',
    'category',
    'isActive',
    'isBillable',
  ],

  // Patient: No inventory access (shouldn't reach this handler, but safe default)
  [Role.PATIENT]: [
    'id', // Only basic identifier
  ],
};

/**
 * Fallback public fields visible to any unrecognized/missing role
 * This is a fail-safe minimum set
 */
const PUBLIC_FIELDS: (keyof InventoryItem)[] = ['id', 'name', 'category'];

/**
 * Filter inventory item fields based on user role
 *
 * Returns a partial InventoryItem containing only fields the role is authorized to view.
 * Returns undefined for fields the role cannot access.
 *
 * @param item - Full InventoryItem from database
 * @param role - User's role
 * @returns Partial<InventoryItem> with only allowed fields
 */
export function filterItemFields(
  item: InventoryItem,
  role: Role | string,
): Partial<InventoryItem> {
  // Validate role and determine allowed fields
  let allowedFields: (keyof InventoryItem)[];

  if (role in Role) {
    allowedFields = FIELD_VISIBILITY_MAP[role as Role] || PUBLIC_FIELDS;
  } else {
    // Unknown role: apply fail-safe public fields
    allowedFields = PUBLIC_FIELDS;
  }

  // Build filtered item
  const filtered: Partial<InventoryItem> = {};

  for (const field of allowedFields) {
    (filtered as Record<string, unknown>)[field] = item[field];
  }

  return filtered;
}

/**
 * Get the list of allowed fields for a role
 *
 * Useful for runtime field authorization checks or documentation.
 *
 * @param role - User's role
 * @returns Array of field names the role can access
 */
export function getAllowedFieldsForRole(role: Role | string): (keyof InventoryItem)[] {
  if (role in Role) {
    return FIELD_VISIBILITY_MAP[role as Role] || PUBLIC_FIELDS;
  }
  return PUBLIC_FIELDS;
}

/**
 * Check if a role can view a specific field
 *
 * @param role - User's role
 * @param field - Field name to check
 * @returns true if role can view the field
 */
export function canViewField(role: Role | string, field: keyof InventoryItem): boolean {
  const allowedFields = getAllowedFieldsForRole(role);
  return allowedFields.includes(field);
}
