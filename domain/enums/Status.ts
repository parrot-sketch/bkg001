/**
 * Domain Enum: Status
 * 
 * Represents the status of a user or resource in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DORMANT = 'DORMANT',
}

/**
 * Type guard to check if a string is a valid Status
 */
export function isStatus(value: string): value is Status {
  return Object.values(Status).includes(value as Status);
}

/**
 * Check if a status indicates the resource is available for use
 */
export function isStatusActive(status: Status): boolean {
  return status === Status.ACTIVE;
}

/**
 * Check if a status indicates the resource is not available
 */
export function isStatusInactive(status: Status): boolean {
  return status === Status.INACTIVE || status === Status.DORMANT;
}
