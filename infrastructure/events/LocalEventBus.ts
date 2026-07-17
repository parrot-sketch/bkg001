import {
  DomainEvent,
  EventBus,
  EventBusHealth,
  EventHandler,
  validateDomainEvent,
} from '@/domain/events/DomainEvent';
import { logEvent } from './EventLogger';

/**
 * LocalEventBus — in-process implementation of the EventBus port.
 *
 * Conforms to architecture/02-event-catalog/event-envelope.md.
 *
 * Guarantees (Deliverable 4):
 *   - publish() / subscribe() / unsubscribe()
 *   - multiple subscribers per event type
 *   - asynchronous handlers (awaited)
 *   - handler isolation: a failing subscriber NEVER stops other subscribers,
 *     and NEVER causes publish() to reject. Handler failures are logged and
 *     counted for health reporting.
 *
 * This is the Phase-1 transport. It can be swapped for Postgres/Redis/Kafka
 * implementations later without touching business code, because business code
 * depends only on the EventPublisher / EventRecorder ports.
 */
export class LocalEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();
  private started = false;
  private errorCount = 0;
  private publishedCount = 0;

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    validateDomainEvent(event);
    this.publishedCount++;

    const handlers = this.handlers.get(event.eventType);
    logEvent(event, 'PUBLISHED', {
      detail: `subscribers=${handlers ? handlers.size : 0}`,
    });

    if (!handlers || handlers.size === 0) {
      return;
    }

    // Handler isolation: run every handler, isolate failures.
    // `allSettled` guarantees one rejecting handler cannot short-circuit others.
    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => this.invokeHandler(event, handler)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.errorCount++;
        logEvent(event, 'HANDLER_ERROR', {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  }

  async publishBatch<T>(events: DomainEvent<T>[]): Promise<void> {
    for (const event of events) {
      // Sequential to preserve per-aggregate ordering (Rule 8).
      await this.publish(event);
    }
  }

  private async invokeHandler<T>(
    event: DomainEvent<T>,
    handler: EventHandler<T>,
  ): Promise<void> {
    // Wrap so a synchronous throw is turned into a rejected promise too.
    await handler(event);
    logEvent(event, 'DELIVERED');
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler as EventHandler<any>);
  }

  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(eventType);
    if (!set) return;
    set.delete(handler as EventHandler<any>);
    if (set.size === 0) {
      this.handlers.delete(eventType);
    }
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async getHealth(): Promise<EventBusHealth> {
    return {
      healthy: this.started,
      pendingCount: 0, // in-memory bus has no queue; outbox owns durability
      errorCount: this.errorCount,
    };
  }

  // ── Test / introspection helpers (not part of the port) ──

  /** Number of handlers registered for an event type. */
  subscriberCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /** Total successful publish() calls (accepted by the bus). */
  getPublishedCount(): number {
    return this.publishedCount;
  }
}
