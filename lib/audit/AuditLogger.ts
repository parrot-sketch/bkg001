import { PrismaClient } from '@prisma/client';

export type AuditAction = 'VIEW' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT';

interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * HIPAA Audit Logger
 *
 * Logs all access to Protected Health Information (PHI).
 * Required by HIPAA §164.312(b) — Audit Controls.
 *
 * Every read/write of patient data MUST go through this logger.
 * Logs are append-only and immutable in production.
 */
export class AuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async log(params: {
    action: AuditAction;
    model: string;
    recordId: string;
    details?: string;
    context: AuditContext;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: params.context.userId,
          record_id: params.recordId,
          action: params.action,
          model: params.model,
          details: params.details ?? null,
          ip_address: params.context.ipAddress ?? null,
          user_agent: params.context.userAgent ?? null,
        },
      });
    } catch (error) {
      // Audit failure must never block the operation.
      // Log to stderr for infrastructure monitoring.
      console.error('[AuditLogger] Failed to write audit log:', error);
    }
  }

  async logPatientAccess(context: AuditContext, patientId: string, action: AuditAction = 'VIEW'): Promise<void> {
    return this.log({ action, model: 'Patient', recordId: patientId, context });
  }

  async logPatientList(context: AuditContext, filters: string): Promise<void> {
    return this.log({ action: 'LIST', model: 'Patient', recordId: '*', details: filters, context });
  }
}
