/**
 * Inventory UI Permissions
 * 
 * Role-aware navigation and UI visibility helpers for inventory operations.
 */

import { Role } from '@/domain/enums/Role';

export type InventoryRouteKey =
  | 'vendors'
  | 'purchase-orders'
  | 'receipts'
  | 'items'
  | 'stock-report'
  | 'consumption-report'
  | 'audit'
  | 'adjustments';

const INVENTORY_NAV_PERMISSIONS: Record<Role, InventoryRouteKey[]> = {
  [Role.ADMIN]: [
    'vendors',
    'purchase-orders',
    'receipts',
    'items',
    'stock-report',
    'consumption-report',
    'audit',
    'adjustments',
  ],
  [Role.STORES]: [
    'vendors',
    'purchase-orders',
    'receipts',
    'items',
    'stock-report',
  ],
  [Role.FRONTDESK]: [
    'items', // Read-only
    'stock-report', // Read-only
  ],
  [Role.NURSE]: [], // No supply-side access, only surgical case tabs
  [Role.DOCTOR]: [], // No supply-side access, only surgical case tabs
  [Role.PATIENT]: [],
  [Role.CASHIER]: [],
  [Role.LAB_TECHNICIAN]: [],
  [Role.THEATER_TECHNICIAN]: [],
};

/**
 * Check if a role can view a specific inventory navigation route
 */
export function canViewInventoryNav(role: Role, routeKey: InventoryRouteKey): boolean {
  const allowedRoutes = INVENTORY_NAV_PERMISSIONS[role] || [];
  return allowedRoutes.includes(routeKey);
}

/**
 * Get all inventory routes accessible by a role
 */
export function getAccessibleInventoryRoutes(role: Role): InventoryRouteKey[] {
  return INVENTORY_NAV_PERMISSIONS[role] || [];
}

/**
 * Check if a role can perform write operations on inventory
 */
export function canModifyInventory(role: Role): boolean {
  return role === Role.ADMIN || role === Role.STORES;
}

/**
 * Check if a role can view cost/valuation data
 */
export function canViewInventoryCosts(role: Role): boolean {
  return role === Role.ADMIN;
}
