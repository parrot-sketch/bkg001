import { IAuditService, AuditEvent } from '../../domain/interfaces/services/IAuditService';

/**
 * Service: ConsoleAuditService
 * 
 * Console-based implementation of IAuditService.
 * This is a temporary implementation that logs audit events to the console.
 * 
 * In production, this would be replaced with:
 * - Database-based audit service (PrismaAuditService)
 * - External audit logging service
 * - Structured logging system
 * 
 * Responsibilities:
 * - Log audit events in a structured format
 * - NO business logic - only logging
 * 
 * Clean Architecture Rule: This class implements domain interface,
 * translating domain concepts to infrastructure (console logging).
 */
export class ConsoleAuditService implements IAuditService {
  /**
   * Records an audit event to the console
   * 
   * This implementation logs structured audit events to console.
   * In production, this should write to a persistent audit log.
   * 
   * @param event - The audit event to record
   * @returns Promise that resolves when the audit event is recorded
   * @throws Error if the audit event cannot be recorded
   */
  async recordEvent(event: AuditEvent): Promise<void> {
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        userId: event.userId,
        recordId: event.recordId,
        action: event.action,
        model: event.model,
        details: event.details ?? null,
        ipAddress: event.ipAddress ?? null,
        sessionId: event.sessionId ?? null,
      };

      // Log as JSON for structured logging
      console.log(JSON.stringify(auditLog));

      // Also log in human-readable format for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[AUDIT] ${auditLog.timestamp} | User: ${auditLog.userId} | Action: ${auditLog.action} | Model: ${auditLog.model} | Record: ${auditLog.recordId}`
        );
      }
    } catch (error) {
      // Audit logging failures should not break the application
      // but we should log the failure
      console.error('Failed to record audit event:', error);
      throw new Error(`Failed to record audit event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
