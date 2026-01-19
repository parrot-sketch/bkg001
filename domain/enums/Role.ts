/**
 * Domain Enum: Role
 * 
 * Represents user roles in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 * 
 * Note: This mirrors the Prisma Role enum but is domain-only.
 */
export enum Role {
  ADMIN = 'ADMIN',
  NURSE = 'NURSE',
  DOCTOR = 'DOCTOR',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PATIENT = 'PATIENT',
  CASHIER = 'CASHIER',
  FRONTDESK = 'FRONTDESK',
}

/**
 * Type guard to check if a string is a valid Role
 */
export function isRole(value: string): value is Role {
  return Object.values(Role).includes(value as Role);
}

/**
 * Get all valid role values
 */
export function getAllRoles(): readonly Role[] {
  return Object.values(Role);
}
