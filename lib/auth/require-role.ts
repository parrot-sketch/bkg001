/**
 * Role-based authorization helpers
 *
 * Provides reusable functions for checking user roles
 * and enforcing role-based access control.
 */

import { Role } from '@/domain/enums/Role';
import { AuthContext } from '@/lib/auth/types';

/**
 * Clinic desk staff: frontdesk ops (intake, queue, appointments, billing)
 * are shared by reception, nurses, and theater techs.
 */
export const CLINIC_DESK_ROLES: Role[] = [
  Role.FRONTDESK,
  Role.NURSE,
  Role.THEATER_TECHNICIAN,
  Role.ADMIN,
];

/** String form for requireAuth(request, ...) */
export const CLINIC_DESK_ROLE_NAMES: string[] = CLINIC_DESK_ROLES.map((r) => r as string);

/**
 * Check if a user has one of the allowed roles
 */
export function hasRole(user: AuthContext | null | undefined, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role as Role);
}

export function isAdmin(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

export function isDoctor(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.DOCTOR || user?.role === Role.ADMIN;
}

export function isNurse(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.NURSE || user?.role === Role.ADMIN;
}

/** Reception / nurse / theater tech / admin — shared desk privileges */
export function isFrontdesk(user: AuthContext | null | undefined): boolean {
  return hasRole(user, CLINIC_DESK_ROLES);
}

export function isClinicDeskStaff(user: AuthContext | null | undefined): boolean {
  return hasRole(user, CLINIC_DESK_ROLES);
}

export function isTheaterTech(user: AuthContext | null | undefined): boolean {
  return user?.role === Role.THEATER_TECHNICIAN || user?.role === Role.ADMIN;
}

export function requireRole(
  user: AuthContext | null | undefined,
  allowedRoles: Role[],
  message?: string
): AuthContext {
  if (!user) {
    throw new Error(message || 'Authentication required');
  }

  if (!allowedRoles.includes(user.role as Role)) {
    throw new Error(
      message || `Role ${user.role} is not authorized. Allowed roles: ${allowedRoles.join(', ')}`
    );
  }

  return user;
}

export function authorizeApiRequest(
  authResult: { success: boolean; user?: AuthContext },
  allowedRoles: Role[]
): authResult is { success: true; user: AuthContext } {
  if (!authResult.success || !authResult.user) {
    return false;
  }

  const userRole = authResult.user.role as Role;
  return allowedRoles.includes(userRole);
}
