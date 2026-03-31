import { IntakeSession } from '@/domain/entities/IntakeSession';
import type { IntakeSession as PrismaIntakeSession } from '@prisma/client';
import type { IntakeSessionStatus } from '@/domain/entities/IntakeSession';

/**
 * Mapper: IntakeSession ↔ Prisma
 *
 * Pure data transformation only — no business logic.
 */
export class IntakeSessionMapper {
  static toDomain(raw: PrismaIntakeSession): IntakeSession {
    return IntakeSession.restore({
      sessionId: raw.session_id,
      status: raw.status as IntakeSessionStatus,
      createdAt: raw.created_at,
      expiresAt: raw.expires_at,
      createdByUserId: raw.created_by_user_id ?? undefined,
    });
  }

  static toPersistence(session: IntakeSession) {
    const p = session.toPrimitive();
    return {
      session_id: p.sessionId,
      status: p.status,
      created_at: new Date(p.createdAt),
      expires_at: new Date(p.expiresAt),
      created_by_user_id: p.createdByUserId ?? null,
    };
  }
}
