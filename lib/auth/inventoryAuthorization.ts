/**
 * Inventory Authorization Utility
 * 
 * Reusable authorization helper for inventory operations.
 * Uses RolePermissionMatrix to enforce role-based access control.
 */

import { NextResponse } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { InventoryOperation, hasInventoryPermission } from '@/domain/permissions/InventoryRolePermissions';
import { ForbiddenError } from '@/application/errors';
import { handleApiError } from '@/app/api/_utils/handleApiError';

export interface AuthUser {
  userId: string;
  role: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: NextResponse;
}

/**
 * Authorize a user for an inventory operation
 * 
 * @param authResult - Result from JwtMiddleware.authenticate
 * @param operation - The inventory operation to authorize
 * @param context - Optional context (e.g., caseId for case-specific checks)
 * @returns AuthResult with success/error
 */
export function authorizeInventoryOperation(
  authResult: AuthResult,
  operation: InventoryOperation,
  context?: { caseId?: string; userId?: string }
): AuthResult {
  if (!authResult.success || !authResult.user) {
    return {
      success: false,
      error: handleApiError(new ForbiddenError('Authentication required')),
    };
  }

  const userRole = authResult.user.role as Role;

  if (!hasInventoryPermission(userRole, operation)) {
    return {
      success: false,
      error: handleApiError(
        new ForbiddenError(
          `Role ${userRole} does not have permission for operation: ${operation}`
        )
      ),
    };
  }

  // Additional context-based checks can be added here
  // For example, checking if user owns the case for OWN_CASES visibility

  return {
    success: true,
    user: authResult.user,
  };
}

/**
 * Convenience function to authorize multiple roles
 */
export function authorizeRoles(
  authResult: AuthResult,
  allowedRoles: Role[]
): AuthResult {
  if (!authResult.success || !authResult.user) {
    return {
      success: false,
      error: handleApiError(new ForbiddenError('Authentication required')),
    };
  }

  const userRole = authResult.user.role as Role;

  if (!allowedRoles.includes(userRole)) {
    return {
      success: false,
      error: handleApiError(
        new ForbiddenError(
          `Role ${userRole} is not authorized. Allowed roles: ${allowedRoles.join(', ')}`
        )
      ),
    };
  }

  return {
    success: true,
    user: authResult.user,
  };
}
