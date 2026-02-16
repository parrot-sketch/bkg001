import { OutboxEvent, OutboxStatus } from '@prisma/client';

export interface IOutboxRepository {
    create(data: {
        type: string;
        payload: Record<string, any>;
        idempotencyKey?: string;
    }): Promise<OutboxEvent>;

    findPending(limit: number): Promise<OutboxEvent[]>;

    markProcessed(id: string): Promise<OutboxEvent>;

    markFailed(id: string, error: string): Promise<OutboxEvent>;
}
