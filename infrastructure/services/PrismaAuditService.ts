import { IAuditService, AuditEvent } from '../../domain/interfaces/services/IAuditService';
import { PrismaClient } from '@prisma/client';

/**
 * Service: PrismaAuditService
 * 
 * Database-based implementation of IAuditService using Prisma.
 * This service persists audit events to the AuditLog table.
 * 
 * Responsibilities:
 * - Persist audit events to database
 * - NO business logic - only data persistence
 * 
 * Clean Architecture Rule: This class implements domain interface,
 * translating domain concepts to infrastructure (database persistence).
 */
export class PrismaAuditService implements IAuditService {
    constructor(private readonly prisma: PrismaClient) {
        if (!prisma) {
            throw new Error('PrismaClient is required');
        }
    }

    /**
     * Records an audit event to the database
     * 
     * @param event - The audit event to record
     * @returns Promise that resolves when the audit event is recorded
     * @throws Error if the audit event cannot be recorded
     */
    async recordEvent(event: AuditEvent): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    user_id: event.userId,
                    record_id: event.recordId,
                    action: event.action,
                    model: event.model,
                    details: event.details ?? null,
                    ip_address: event.ipAddress ?? null,
                    user_agent: event.sessionId ?? null, // Map sessionId to user_agent
                },
            });

            // Also log to console in development for debugging
            if (process.env.NODE_ENV !== 'production') {
                console.log(
                    `[AUDIT] ${event.action} | User: ${event.userId} | Model: ${event.model} | Record: ${event.recordId}`
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
