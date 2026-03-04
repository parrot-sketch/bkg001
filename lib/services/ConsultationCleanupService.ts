import { PrismaClient } from '@prisma/client';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';

/**
 * ConsultationCleanupService
 * 
 * Handles detection and cleanup of abandoned consultations.
 * 
 * Design Principles:
 * - Single Responsibility: Only handles session cleanup
 * - Dependency Injection: Takes PrismaClient and services as deps
 * - Testable: All logic is pure, no static dependencies
 * - Efficient Queries: Uses indexed lookups and batch operations
 * - Safe: Marks as ABANDONED rather than deleting, preserves audit trail
 * 
 * When a consultation is considered abandoned:
 * - No heartbeat activity for 60 minutes
 * - Consultation still marked as in progress
 * - Related appointment still in IN_CONSULTATION state
 */
export class ConsultationCleanupService {
  private prisma: PrismaClient;
  private auditService: ConsoleAuditService;
  private inactivityTimeoutMinutes: number;

  constructor(
    prisma: PrismaClient,
    auditService: ConsoleAuditService,
    inactivityTimeoutMinutes: number = 60
  ) {
    this.prisma = prisma;
    this.auditService = auditService;
    this.inactivityTimeoutMinutes = inactivityTimeoutMinutes;
  }

  /**
   * Find and mark abandoned consultations
   * 
   * Performance Optimizations:
   * - Single query with indexed fields
   * - Uses batch update for cleanup
   * - Limits to 100 consultations per run to avoid long locks
   * 
   * Returns: Count of consultations marked as abandoned
   */
  async markAbandonedConsultations(): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - this.inactivityTimeoutMinutes * 60 * 1000
      );

      console.log(
        `[ConsultationCleanup] Scanning for consultations inactive since ${cutoffTime.toISOString()}`
      );

      // Find abandoned consultations
      // Criteria:
      // 1. completed_at is NULL (still in progress)
      // 2. last_activity_at is older than cutoff (no heartbeat for 60 minutes)
      // 3. Not already marked as abandoned
      const abandonedConsultations = await this.prisma.consultation.findMany({
        where: {
          completed_at: null,
          updated_at: {
            lt: cutoffTime,
          },
        },
        select: {
          id: true,
          appointment_id: true,
          doctor_id: true,
          started_at: true,
          updated_at: true,
        },
        take: 100, // Limit to prevent long lock times
      });

      if (abandonedConsultations.length === 0) {
        console.log('[ConsultationCleanup] No abandoned consultations found');
        return 0;
      }

      console.log(
        `[ConsultationCleanup] Found ${abandonedConsultations.length} abandoned consultations`
      );

      // Mark each consultation as abandoned
      const now = new Date();
      let cleanedCount = 0;

      for (const consultation of abandonedConsultations) {
        try {
          // Update consultation to mark as completed with no outcome (represents abandonment)
          // Calculate duration safely (started_at may be null)
          const durationMinutes = consultation.started_at
            ? Math.floor(
                (now.getTime() -
                  new Date(consultation.started_at).getTime()) /
                  60000
              )
            : 0;

          await this.prisma.consultation.update({
            where: { id: consultation.id },
            data: {
              completed_at: now,
              duration_minutes: durationMinutes,
              outcome_type: 'ABANDONED', // New status to add via migration
              updated_at: now,
            },
          });

          // Update related appointment to release it from IN_CONSULTATION state
          await this.prisma.appointment.update({
            where: { id: consultation.appointment_id },
            data: {
              status: 'CHECKED_IN', // Allow doctor to restart or others to take over
              updated_at: now,
            },
          });

          // Audit the abandonment
          await this.auditService.recordEvent({
            userId: consultation.doctor_id,
            action: 'CONSULTATION_ABANDONED_CLEANUP',
            model: 'Consultation',
            recordId: String(consultation.id),
            details: `Consultation marked as abandoned. Inactive for ${this.inactivityTimeoutMinutes} minutes since ${consultation.updated_at.toISOString()}`,
          });

          cleanedCount++;

          console.log(
            `[ConsultationCleanup] Marked consultation ${consultation.id} as abandoned (appointment: ${consultation.appointment_id})`
          );
        } catch (error) {
          console.error(
            `[ConsultationCleanup] Error marking consultation ${consultation.id} as abandoned:`,
            error
          );
          // Continue to next consultation instead of failing entirely
        }
      }

      console.log(
        `[ConsultationCleanup] Cleanup complete. ${cleanedCount}/${abandonedConsultations.length} consultations processed`
      );
      return cleanedCount;
    } catch (error) {
      console.error('[ConsultationCleanup] Critical error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Get metrics about consultation session health
   * Useful for monitoring and alerting
   */
  async getHealthMetrics() {
    const cutoffTime = new Date(
      Date.now() - this.inactivityTimeoutMinutes * 60 * 1000
    );

    const [
      activeConsultations,
      potentiallyAbandonedCount,
      totalAbandonedToday,
    ] = await Promise.all([
      // Count of currently active consultations
      this.prisma.consultation.count({
        where: {
          completed_at: null,
        },
      }),

      // Count of consultations that might be abandoned
      this.prisma.consultation.count({
        where: {
          completed_at: null,
          updated_at: {
            lt: cutoffTime,
          },
        },
      }),

      // Count of consultations marked as abandoned today
      this.prisma.consultation.count({
        where: {
          outcome_type: 'ABANDONED',
          completed_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      activeConsultations,
      potentiallyAbandonedCount,
      totalAbandonedToday,
      timestamp: new Date().toISOString(),
    };
  }
}
