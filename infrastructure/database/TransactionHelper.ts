import { PrismaClient } from '@prisma/client';

/**
 * Helper: TransactionHelper
 * 
 * Provides transaction management for aggregate operations.
 * 
 * In DDD, aggregates should be persisted atomically. This helper ensures
 * that all changes to an aggregate (e.g., Appointment + Consultation) are
 * saved in a single transaction.
 * 
 * Usage:
 * ```typescript
 * await TransactionHelper.execute(prisma, async (tx) => {
 *   await appointmentRepo.update(appointment, tx);
 *   await consultationRepo.save(consultation, tx);
 * });
 * ```
 */
export class TransactionHelper {
  /**
   * Executes a function within a database transaction
   * 
   * @param prisma - PrismaClient instance
   * @param callback - Function to execute within transaction
   * @returns Promise resolving to the return value of the callback
   * @throws Error if transaction fails (will rollback automatically)
   */
  static async execute<T>(
    prisma: PrismaClient,
    callback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      return callback(tx as PrismaClient);
    });
  }

  /**
   * Executes multiple operations atomically
   * 
   * @param prisma - PrismaClient instance
   * @param operations - Array of operations to execute
   * @returns Promise resolving when all operations complete
   */
  static async executeAll(
    prisma: PrismaClient,
    operations: Array<(tx: PrismaClient) => Promise<void>>
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await Promise.all(operations.map((op) => op(tx as PrismaClient)));
    });
  }
}
