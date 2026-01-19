/**
 * Domain Enum: JobType
 * 
 * Represents the employment type (full-time or part-time).
 * This is a pure TypeScript enum with no framework dependencies.
 */
export enum JobType {
  FULL = 'FULL',
  PART = 'PART',
}

/**
 * Type guard to check if a string is a valid JobType
 */
export function isJobType(value: string): value is JobType {
  return Object.values(JobType).includes(value as JobType);
}

/**
 * Get all valid job type values
 */
export function getAllJobTypes(): readonly JobType[] {
  return Object.values(JobType);
}
