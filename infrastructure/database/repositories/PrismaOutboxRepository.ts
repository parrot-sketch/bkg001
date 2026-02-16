import { IOutboxRepository } from '@/domain/interfaces/repositories/IOutboxRepository';
import { OutboxEvent, OutboxStatus } from '@prisma/client';
import db from '@/lib/db';

export class PrismaOutboxRepository implements IOutboxRepository {
    async create(data: {
        type: string;
        payload: Record<string, any>;
        idempotencyKey?: string;
    }): Promise<OutboxEvent> {
        return await db.outboxEvent.create({
            data: {
                type: data.type,
                payload: JSON.stringify(data.payload),
                idempotency_key: data.idempotencyKey,
                status: OutboxStatus.PENDING,
            },
        });
    }

    async findPending(limit: number): Promise<OutboxEvent[]> {
        return await db.outboxEvent.findMany({
            where: { status: OutboxStatus.PENDING },
            orderBy: { created_at: 'asc' },
            take: limit,
        });
    }

    async markProcessed(id: string): Promise<OutboxEvent> {
        return await db.outboxEvent.update({
            where: { id },
            data: {
                status: OutboxStatus.PROCESSED,
                processed_at: new Date(),
            },
        });
    }

    async markFailed(id: string, error: string): Promise<OutboxEvent> {
        return await db.outboxEvent.update({
            where: { id },
            data: {
                status: OutboxStatus.FAILED,
                error_message: error,
                retry_count: { increment: 1 },
            },
        });
    }
}
