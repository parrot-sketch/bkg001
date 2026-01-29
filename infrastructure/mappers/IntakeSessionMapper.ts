import { IntakeSession } from '@/domain/entities/IntakeSession';
import { IntakeSession as PrismaIntakeSession } from '@prisma/client';
import type { IntakeSessionStatus } from '@/domain/entities/IntakeSession';

/**
 * Mapper: IntakeSessionMapper
 *
 * Maps between:
 * - Domain: IntakeSession entity
 * - Persistence: Prisma IntakeSession model
 * - API: PatientIntakeSessionDto
 */
export class IntakeSessionMapper {
  /**
   * Convert Prisma record to domain entity
   */
  static toDomain(raw: PrismaIntakeSession): IntakeSession {
    return IntakeSession.restore({
      sessionId: raw.session_id,
      status: raw.status as IntakeSessionStatus,
      createdAt: raw.created_at,
      expiresAt: raw.expires_at,
      createdByUserId: raw.created_by_user_id ?? undefined,
    });
  }

  /**
   * Convert domain entity to Prisma persistence format
   */
  static toPersistence(session: IntakeSession) {
    const primitive = session.toPrimitive();
    return {
      session_id: primitive.sessionId,
      status: primitive.status,
      created_at: new Date(primitive.createdAt),
      expires_at: new Date(primitive.expiresAt),
    };
  }

  /**
   * Convert domain entity to API DTO
   */
  static toDto(session: IntakeSession, qrCodeUrl: string) {
    const primitive = session.toPrimitive();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    return {
      sessionId: primitive.sessionId,
      qrCodeUrl,
      intakeFormUrl: `${baseUrl}/patient/intake?sessionId=${primitive.sessionId}`,
      expiresAt: primitive.expiresAt,
      minutesRemaining: primitive.minutesRemaining,
    };
  }
}
