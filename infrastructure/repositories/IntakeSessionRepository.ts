import { PrismaClient } from '@prisma/client';
import { IntakeSession } from '@/domain/entities/IntakeSession';
import type { IntakeSessionStatus } from '@/domain/entities/IntakeSession';
import { IntakeSessionMapper } from '@/infrastructure/mappers/IntakeSessionMapper';

export interface IIntakeSessionRepository {
  create(session: IntakeSession): Promise<IntakeSession>;
  findBySessionId(sessionId: string): Promise<IntakeSession | null>;
  save(session: IntakeSession): Promise<void>;
  updateStatus(sessionId: string, status: IntakeSessionStatus): Promise<void>;
}

export class PrismaIntakeSessionRepository implements IIntakeSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(session: IntakeSession): Promise<IntakeSession> {
    const data = IntakeSessionMapper.toPersistence(session);
    await this.prisma.intakeSession.create({ data });
    return session;
  }

  async findBySessionId(sessionId: string): Promise<IntakeSession | null> {
    const record = await this.prisma.intakeSession.findUnique({
      where: { session_id: sessionId },
    });
    return record ? IntakeSessionMapper.toDomain(record) : null;
  }

  async save(session: IntakeSession): Promise<void> {
    const data = IntakeSessionMapper.toPersistence(session);
    await this.prisma.intakeSession.update({
      where: { session_id: session.getSessionId() },
      data: { status: data.status },
    });
  }

  async updateStatus(sessionId: string, status: IntakeSessionStatus): Promise<void> {
    await this.prisma.intakeSession.update({
      where: { session_id: sessionId },
      data: { status },
    });
  }
}
