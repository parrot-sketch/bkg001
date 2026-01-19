/**
 * Domain Enum: Gender
 * 
 * Represents gender identity in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/**
 * Type guard to check if a string is a valid Gender
 */
export function isGender(value: string): value is Gender {
  return Object.values(Gender).includes(value as Gender);
}

/**
 * Get all valid gender values
 */
export function getAllGenders(): readonly Gender[] {
  return Object.values(Gender);
}
