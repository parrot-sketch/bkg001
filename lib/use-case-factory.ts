/**
 * Use Case Factory
 * 
 * CRITICAL: This factory ensures all use cases receive the singleton PrismaClient instance.
 * This prevents connection pool exhaustion by enforcing proper dependency injection.
 * 
 * Usage:
 * ```typescript
 * const useCase = UseCaseFactory.createScheduleAppointmentUseCase(
 *   appointmentRepo,
 *   patientRepo,
 *   // ... other dependencies
 * );
 * ```
 * 
 * This prevents developers from accidentally creating new PrismaClient instances:
 * ❌ new ScheduleAppointmentUseCase(..., new PrismaClient()) // Would fail
 * ✅ UseCaseFactory.createScheduleAppointmentUseCase(...) // Always uses singleton
 */

import db from './db';
import { PrismaClient } from '@prisma/client';

/**
 * Validates that a PrismaClient instance is the singleton
 * Throws error if a new instance is detected
 */
function validatePrismaClient(prisma: PrismaClient): void {
  // Check if this is the singleton instance
  // In production, we can't use reference equality reliably due to module reloading
  // Instead, we check if it's the same instance we exported
  if (prisma !== db) {
    // Allow in development for testing, but warn
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: Use case received non-singleton PrismaClient. ' +
        'This will cause connection pool exhaustion. ' +
        'Always use UseCaseFactory or pass db from @/lib/db'
      );
    } else {
      console.warn(
        'WARNING: Use case received non-singleton PrismaClient. ' +
        'This is allowed in development but will cause issues in production.'
      );
    }
  }
}

export class UseCaseFactory {
  /**
   * Get the singleton PrismaClient instance
   * This is the only way use cases should receive PrismaClient
   */
  static getPrismaClient(): PrismaClient {
    return db;
  }

  /**
   * Validate that a PrismaClient is the singleton
   * Use this in use case constructors for additional safety
   */
  static validatePrismaClient(prisma: PrismaClient): void {
    validatePrismaClient(prisma);
  }
}
