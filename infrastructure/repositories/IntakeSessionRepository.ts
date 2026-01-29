import { PrismaClient, IntakeSession as PrismaIntakeSession } from '@prisma/client';
import { IntakeSession } from '@/domain/entities/IntakeSession';
import type { IntakeSessionStatus } from '@/domain/entities/IntakeSession';

/**
 * Repository Interface: IntakeSessionRepository
 *
 * Defines contract for persisting IntakeSessions
 */
export interface IIntakeSessionRepository {
  create(session: IntakeSession): Promise<IntakeSession>;
  findBySessionId(sessionId: string): Promise<IntakeSession | null>;
  updateStatus(sessionId: string, status: string): Promise<IntakeSession>;
  markAsExpired(sessionId: string): Promise<IntakeSession>;
}

/**
 * Implementation: PrismaIntakeSessionRepository
 *
 * Uses Prisma ORM for database access
 */
export class PrismaIntakeSessionRepository implements IIntakeSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(session: IntakeSession): Promise<IntakeSession> {
    const data = session.toPrimitive();

    await this.prisma.intakeSession.create({
      data: {
        session_id: data.sessionId,
        status: data.status,
        created_at: data.createdAt,
        expires_at: data.expiresAt,
      },
    });

    return session;
  }

  async findBySessionId(sessionId: string): Promise<IntakeSession | null> {
    const record = await this.prisma.intakeSession.findUnique({
      where: { session_id: sessionId },
    });

    if (!record) {
      return null;
    }

    return IntakeSession.restore({
      sessionId: record.session_id,
      status: record.status as IntakeSessionStatus,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
      createdByUserId: record.created_by_user_id ?? undefined,
    });
  }

  async updateStatus(sessionId: string, status: string): Promise<IntakeSession> {
    const record = await this.prisma.intakeSession.update({
      where: { session_id: sessionId },
      data: { status },
    });

    return IntakeSession.restore({
      sessionId: record.session_id,
      status: record.status as IntakeSessionStatus,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
      createdByUserId: record.created_by_user_id ?? undefined,
    });
  }

  async markAsExpired(sessionId: string): Promise<IntakeSession> {
    return this.updateStatus(sessionId, 'EXPIRED');
  }
}
