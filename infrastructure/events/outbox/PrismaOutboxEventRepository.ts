import type { OutboxEvent } from '@prisma/client';
import { OutboxStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  CreateOutboxEventInput,
  IOutboxEventRepository,
  PrismaExecutor,
} from './IOutboxEventRepository';

/**
 * Prisma-backed Transactional Outbox repository.
 *
 * Uses the existing `OutboxEvent` model / `outbox_event` table:
 *   id, type, payload, status, error_message, retry_count,
 *   processed_at, idempotency_key, created_at, updated_at
 */
export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly client: PrismaExecutor = db) {}

  async create(
    input: CreateOutboxEventInput,
    tx?: PrismaExecutor,
  ): Promise<OutboxEvent> {
    const executor = tx ?? this.client;
    return executor.outboxEvent.create({
      data: {
        type: input.type,
        payload: input.payload,
        idempotency_key: input.idempotencyKey,
        status: OutboxStatus.PENDING,
      },
    });
  }

  async findPending(limit: number): Promise<OutboxEvent[]> {
    return this.client.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  async findRetryable(limit: number, maxRetries: number): Promise<OutboxEvent[]> {
    return this.client.outboxEvent.findMany({
      where: {
        status: OutboxStatus.FAILED,
        retry_count: { lt: maxRetries },
      },
      orderBy: { updated_at: 'asc' },
      take: limit,
    });
  }

  async claim(id: string): Promise<boolean> {
    // Atomic claim: only succeeds if the row is still dispatchable.
    const result = await this.client.outboxEvent.updateMany({
      where: {
        id,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      },
      data: { status: OutboxStatus.PROCESSING },
    });
    return result.count === 1;
  }

  async markProcessed(id: string): Promise<OutboxEvent> {
    return this.client.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.PROCESSED,
        processed_at: new Date(),
        error_message: null,
      },
    });
  }

  async markFailed(id: string, error: string): Promise<OutboxEvent> {
    return this.client.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        error_message: error.slice(0, 1000),
        retry_count: { increment: 1 },
      },
    });
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    return this.client.outboxEvent.count({ where: { status } });
  }
}
