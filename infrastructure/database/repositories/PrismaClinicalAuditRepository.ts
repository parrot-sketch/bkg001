import { PrismaClient, ClinicalAuditEvent } from '@prisma/client';
import {
  IClinicalAuditRepository,
  CreateClinicalAuditEventDto,
} from '@/domain/interfaces/repositories/IClinicalAuditRepository';

/**
 * Repository: PrismaClinicalAuditRepository
 *
 * Prisma-based implementation of IClinicalAuditRepository.
 * Handles immutable clinical audit event persistence.
 *
 * Audit events are append-only — no update or delete operations.
 */
export class PrismaClinicalAuditRepository implements IClinicalAuditRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  async record(dto: CreateClinicalAuditEventDto): Promise<ClinicalAuditEvent> {
    return this.prisma.clinicalAuditEvent.create({
      data: {
        actor_user_id: dto.actorUserId,
        action_type: dto.actionType,
        entity_type: dto.entityType,
        entity_id: dto.entityId,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<ClinicalAuditEvent[]> {
    return this.prisma.clinicalAuditEvent.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByActor(actorUserId: string, limit = 50): Promise<ClinicalAuditEvent[]> {
    return this.prisma.clinicalAuditEvent.findMany({
      where: { actor_user_id: actorUserId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
