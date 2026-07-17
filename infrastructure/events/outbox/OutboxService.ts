import {
  DomainEvent,
  EventRecorder,
  serializeEvent,
  validateDomainEvent,
} from '@/domain/events/DomainEvent';
import { logEvent } from '../EventLogger';
import {
  IOutboxEventRepository,
  PrismaExecutor,
} from './IOutboxEventRepository';

/**
 * OutboxService — the concrete EventRecorder (Transactional Outbox writer).
 *
 * Business use cases depend on the EventRecorder port and call `record()` /
 * `recordBatch()` ONLY AFTER their business writes have succeeded. This service
 * durably persists the fully-formed DomainEvent envelope into the outbox table.
 * A background OutboxDispatcher later publishes it to the EventBus.
 *
 * Design notes:
 *   - The envelope is validated before persistence (fail fast on malformed).
 *   - `idempotency_key = eventId` (Rule 7 idempotency / dedupe).
 *   - After a successful record, an optional non-blocking dispatch trigger is
 *     fired so events flow promptly even without a long-running worker
 *     (important for serverless). Triggering never blocks or fails the caller.
 *   - `record()` accepts an optional Prisma transaction executor so the outbox
 *     write can be enrolled in the aggregate's transaction when available.
 */
export class OutboxService implements EventRecorder {
  constructor(
    private readonly repo: IOutboxEventRepository,
    private readonly dispatchTrigger?: () => void,
  ) {}

  async record<T>(event: DomainEvent<T>, tx?: PrismaExecutor): Promise<void> {
    validateDomainEvent(event);

    await this.repo.create(
      {
        type: event.eventType,
        payload: serializeEvent(event),
        idempotencyKey: event.eventId,
      },
      tx,
    );

    logEvent(event, 'RECORDED');
    this.triggerDispatch();
  }

  async recordBatch<T>(events: DomainEvent<T>[], tx?: PrismaExecutor): Promise<void> {
    for (const event of events) {
      // Validate + persist each; ordering preserved (Rule 8).
      validateDomainEvent(event);
      await this.repo.create(
        {
          type: event.eventType,
          payload: serializeEvent(event),
          idempotencyKey: event.eventId,
        },
        tx,
      );
      logEvent(event, 'RECORDED');
    }
    this.triggerDispatch();
  }

  private triggerDispatch(): void {
    if (!this.dispatchTrigger) return;
    try {
      // Fire-and-forget: never block or fail the business caller.
      this.dispatchTrigger();
    } catch {
      // ignore — the background dispatcher / next tick will pick it up
    }
  }
}
