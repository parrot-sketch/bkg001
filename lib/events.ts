import type { EventBus, EventRecorder } from '@/domain/events/DomainEvent';
import { LocalEventBus } from '@/infrastructure/events/LocalEventBus';
import { PrismaOutboxEventRepository } from '@/infrastructure/events/outbox/PrismaOutboxEventRepository';
import { OutboxService } from '@/infrastructure/events/outbox/OutboxService';
import { OutboxDispatcher } from '@/infrastructure/events/outbox/OutboxDispatcher';

/**
 * Event Infrastructure Composition Root
 * ─────────────────────────────────────
 * Single place that wires the Phase-1 event infrastructure:
 *
 *   use case ──record()──▶ OutboxService ──▶ outbox_event table
 *                                              │  (background)
 *                                              ▼
 *                       OutboxDispatcher ──publish()──▶ LocalEventBus ──▶ subscribers
 *
 * Business code depends only on the ports (EventRecorder / EventPublisher).
 * The concrete transport (LocalEventBus) and durability layer (Outbox) can be
 * swapped later (Redis/Kafka) without touching business code.
 *
 * Singletons are cached on globalThis so Next.js hot-reload / serverless module
 * re-evaluation does not create duplicate buses or dispatchers.
 */

interface EventInfra {
  bus: LocalEventBus;
  outboxRepository: PrismaOutboxEventRepository;
  outboxService: OutboxService;
  dispatcher: OutboxDispatcher;
}

declare const globalThis: {
  __eventInfra?: EventInfra;
} & typeof global;

function createEventInfra(): EventInfra {
  const bus = new LocalEventBus();
  void bus.start();

  const outboxRepository = new PrismaOutboxEventRepository();

  const dispatcher = new OutboxDispatcher(outboxRepository, bus, {
    batchSize: 50,
    maxRetries: 5,
    baseBackoffMs: 1000,
    pollIntervalMs: 5000,
  });

  // After a use case records an event, kick a non-blocking dispatch so events
  // flow promptly even when no long-running worker is present (serverless).
  const outboxService = new OutboxService(outboxRepository, () => {
    void dispatcher.runOnce();
  });

  return { bus, outboxRepository, outboxService, dispatcher };
}

const eventInfra: EventInfra = globalThis.__eventInfra ?? createEventInfra();
if (!globalThis.__eventInfra) {
  globalThis.__eventInfra = eventInfra;
}

/** The in-process event bus (subscribe/publish). */
export const eventBus: EventBus = eventInfra.bus;

/** The EventRecorder used by business use cases (Transactional Outbox writer). */
export const eventRecorder: EventRecorder = eventInfra.outboxService;

/** The background dispatcher (also exposes runOnce() for manual triggering). */
export const outboxDispatcher = eventInfra.dispatcher;

/** The outbox repository (health/metrics/inspection). */
export const outboxRepository = eventInfra.outboxRepository;
