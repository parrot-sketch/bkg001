/**
 * Inventory Role Permissions
 * 
 * Defines role-governed permissions for inventory operations.
 * This is the single source of truth for who can do what with inventory.
 */

import { Role } from '@/domain/enums/Role';

export type InventoryOperation =
  | 'VIEW_ITEMS'
  | 'CREATE_ITEMS'
  | 'UPDATE_ITEMS'
  | 'DELETE_ITEMS'
  | 'VIEW_VENDORS'
  | 'CREATE_VENDORS'
  | 'UPDATE_VENDORS'
  | 'DELETE_VENDORS'
  | 'VIEW_PURCHASE_ORDERS'
  | 'CREATE_PURCHASE_ORDERS'
  | 'SUBMIT_PURCHASE_ORDERS'
  | 'APPROVE_PURCHASE_ORDERS'
  | 'RECEIVE_GOODS'
  | 'ADJUST_STOCK'
  | 'VIEW_BILLING'
  | 'VIEW_USAGE'
  | 'RECORD_USAGE'
  | 'VIEW_PLANNED_ITEMS'
  | 'CREATE_PLANNED_ITEMS'
  | 'VIEW_REPORTS';

export interface RolePermissions {
  allowedOperations: InventoryOperation[];
  allowedOverrides: string[];
  forbiddenOperations: (InventoryOperation | 'ALL')[];
  billingVisibility: 'NONE' | 'OWN_CASES' | 'ALL';
}

/**
 * Role Permission Matrix
 * 
 * Defines what each role can and cannot do with inventory.
 */
export const InventoryRolePermissionMatrix: Record<Role, RolePermissions> = {
  [Role.STORES]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'VIEW_VENDORS',
      'CREATE_VENDORS',
      'UPDATE_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'CREATE_PURCHASE_ORDERS',
      'SUBMIT_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'VIEW_REPORTS',
    ],
    allowedOverrides: [],
    forbiddenOperations: [
      'DELETE_ITEMS',
      'DELETE_VENDORS',
      'APPROVE_PURCHASE_ORDERS',
      'ADJUST_STOCK',
      'VIEW_BILLING',
      'RECORD_USAGE',
      'CREATE_PLANNED_ITEMS',
    ],
    billingVisibility: 'NONE',
  },

  [Role.FRONTDESK]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'VIEW_BILLING',
    ],
    allowedOverrides: [],
    forbiddenOperations: [
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'CREATE_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'RECORD_USAGE',
      'CREATE_PLANNED_ITEMS',
    ],
    billingVisibility: 'ALL',
  },

  [Role.NURSE]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'VIEW_USAGE',
      'RECORD_USAGE',
      'VIEW_BILLING',
      'VIEW_PLANNED_ITEMS',
    ],
    allowedOverrides: [],
    forbiddenOperations: [
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'CREATE_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'CREATE_PLANNED_ITEMS',
      'VIEW_REPORTS',
    ],
    billingVisibility: 'OWN_CASES',
  },

  [Role.DOCTOR]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'VIEW_USAGE',
      'VIEW_BILLING',
      'VIEW_PLANNED_ITEMS',
      'CREATE_PLANNED_ITEMS',
    ],
    allowedOverrides: [],
    forbiddenOperations: [
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'CREATE_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'RECORD_USAGE',
      'VIEW_REPORTS',
    ],
    billingVisibility: 'OWN_CASES',
  },

  [Role.ADMIN]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'CREATE_VENDORS',
      'UPDATE_VENDORS',
      'DELETE_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'CREATE_PURCHASE_ORDERS',
      'SUBMIT_PURCHASE_ORDERS',
      'APPROVE_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'VIEW_BILLING',
      'VIEW_USAGE',
      'RECORD_USAGE',
      'VIEW_PLANNED_ITEMS',
      'CREATE_PLANNED_ITEMS',
      'VIEW_REPORTS',
    ],
    allowedOverrides: ['ALL'],
    forbiddenOperations: [],
    billingVisibility: 'ALL',
  },

  // Other roles have no inventory permissions
  [Role.LAB_TECHNICIAN]: {
    allowedOperations: [],
    allowedOverrides: [],
    forbiddenOperations: ['ALL'],
    billingVisibility: 'NONE',
  },

  [Role.PATIENT]: {
    allowedOperations: [],
    allowedOverrides: [],
    forbiddenOperations: ['ALL'],
    billingVisibility: 'NONE',
  },

  [Role.CASHIER]: {
    allowedOperations: ['VIEW_BILLING'],
    allowedOverrides: [],
    forbiddenOperations: [
      'VIEW_ITEMS',
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'RECORD_USAGE',
      'CREATE_PLANNED_ITEMS',
    ],
    billingVisibility: 'ALL',
  },

  [Role.THEATER_TECHNICIAN]: {
    allowedOperations: [
      'VIEW_ITEMS',
      'VIEW_USAGE',
      'VIEW_PLANNED_ITEMS',
    ],
    allowedOverrides: [],
    forbiddenOperations: [
      'CREATE_ITEMS',
      'UPDATE_ITEMS',
      'DELETE_ITEMS',
      'VIEW_VENDORS',
      'VIEW_PURCHASE_ORDERS',
      'RECEIVE_GOODS',
      'ADJUST_STOCK',
      'RECORD_USAGE',
      'CREATE_PLANNED_ITEMS',
      'VIEW_BILLING',
      'VIEW_REPORTS',
    ],
    billingVisibility: 'NONE',
  },
};

/**
 * Check if a role has permission for an operation
 */
export function hasInventoryPermission(
  role: Role,
  operation: InventoryOperation
): boolean {
  const permissions = InventoryRolePermissionMatrix[role];
  if (!permissions) {
    return false;
  }

  // Check if operation is explicitly forbidden
  if (
    permissions.forbiddenOperations.includes(operation) ||
    permissions.forbiddenOperations.includes('ALL' as InventoryOperation)
  ) {
    return false;
  }

  // Check if operation is allowed
  return permissions.allowedOperations.includes(operation);
}

/**
 * Get allowed roles for an operation
 */
export function getAllowedRolesForOperation(
  operation: InventoryOperation
): Role[] {
  return Object.values(Role).filter((role) => hasInventoryPermission(role, operation));
}
