/**
 * Permissions for Surgical Plan Feature
 * 
 * Role-based permission checks for surgical plan operations.
 */

import { Role } from '@/domain/enums/Role';

/**
 * Check if a role can view the surgical plan page
 */
export function canViewSurgicalPlan(role: Role): boolean {
  return [
    Role.DOCTOR,
    Role.ADMIN,
    Role.NURSE,
    Role.THEATER_TECHNICIAN,
  ].includes(role);
}

/**
 * Check if a role can edit the surgical plan
 */
export function canEditSurgicalPlan(role: Role): boolean {
  return [
    Role.DOCTOR,
    Role.ADMIN,
  ].includes(role);
}

/**
 * Check if a role can mark a case as ready
 */
export function canMarkCaseReady(role: Role): boolean {
  return [
    Role.DOCTOR,
    Role.ADMIN,
  ].includes(role);
}
