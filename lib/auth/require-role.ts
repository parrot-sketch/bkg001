/**
 * Role-based authorization helpers
 * 
 * Provides reusable functions for checking user roles
 * and enforcing role-based access control.
 */

import { Role } from '@/domain/enums/Role';
import { AuthContext } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

/**
 * Check if a user has one of the allowed roles
 * 
 * @param user - The authenticated user context
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export function hasRole(user: AuthContext | null | undefined, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role as Role);
}

/**
 * Check if a user is an admin
 * 
 * @param user - The authenticated user context
 * @returns True if user is an admin
 */
export function isAdmin(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

/**
 * Check if a user is a doctor
 * 
 * @param user - The authenticated user context
 * @returns True if user is a doctor or admin
 */
export function isDoctor(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.DOCTOR || user?.role === Role.ADMIN;
}

/**
 * Check if a user is a nurse
 * 
 * @param user - The authenticated user context
 * @returns True if user is a nurse or admin
 */
export function isNurse(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.NURSE || user?.role === Role.ADMIN;
}

/**
 * Check if a user is frontdesk
 * 
 * @param user - The authenticated user context
 * @returns True if user is frontdesk, nurse, or admin
 */
export function isFrontdesk(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.FRONTDESK || user?.role === Role.NURSE || user?.role === Role.ADMIN;
}

/**
 * Check if a user is a theater technician
 * 
 * @param user - The authenticated user context
 * @returns True if user is a theater technician or admin
 */
export function isTheaterTech(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.THEATER_TECHNICIAN || user?.role === Role.ADMIN;
}

/**
 * Require that a user has one of the allowed roles.
 * Throws a DomainException if not authorized.
 * 
 * @param user - The authenticated user context
 * @param allowedRoles - Array of allowed roles
 * @param message - Optional error message
 * @returns The user context if authorized
 * @throws DomainException if not authorized
 */
export function requireRole(
  user: AuthContext | null | undefined,
  allowedRoles: Role[],
  message?: string
): AuthContext {
  if (!user) {
    throw new Error(message || 'Authentication required');
  }

  if (!allowedRoles.includes(user.role as Role)) {
    throw new Error(message || `Role ${user.role} is not authorized. Allowed roles: ${allowedRoles.join(', ')}`);
  }

  return user;
}

/**
 * Authorize an API request based on JWT authentication result.
 * Returns a NextResponse error if unauthorized, or null if authorized.
 * 
 * Use with JwtMiddleware.authenticate() or authenticateRequest() results:
 * 
 * @param authResult - Result from JwtMiddleware.authenticate() or authenticateRequest()
 * @param allowedRoles - Array of allowed roles
 * @returns NextResponse error if unauthorized, null if authorized
 */
export function authorizeApiRequest(
  authResult: { success: boolean; user?: AuthContext },
  allowedRoles: Role[]
): authResult is { success: true; user: AuthContext } {
  if (!authResult.success || !authResult.user) {
    return false;
  }

  const userRole = authResult.user.role as Role;

  if (!allowedRoles.includes(userRole)) {
    return false;
  }

  return true;
}
