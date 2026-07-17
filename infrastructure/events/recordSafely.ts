import type { DomainEvent, EventRecorder } from '@/domain/events/DomainEvent';
import { logEventRaw } from './EventLogger';

/**
 * Records domain events via the outbox recorder WITHOUT ever propagating a
 * failure back into the business workflow.
 *
 * Rationale (pilot constraint): "The system must behave exactly as it does
 * today. The only change is that business events are now published alongside
 * existing operations." Therefore a problem in the event-recording side-channel
 * must never break, roll back, or regress the existing, already-committed
 * business operation. Failures are logged (structured, status=FAILED) for
 * observability and operator follow-up.
 *
 * This is only ever called AFTER the business writes have succeeded.
 */
export async function recordEventsSafely(
  recorder: EventRecorder | undefined,
  events: DomainEvent<unknown>[],
): Promise<void> {
  if (!recorder || events.length === 0) return;
  try {
    await recorder.recordBatch(events);
  } catch (error) {
    for (const event of events) {
      logEventRaw({
        event: event.eventType,
        status: 'FAILED',
        eventId: event.eventId,
        aggregate: `${event.aggregateType}:${event.aggregateId}`,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        producer: event.producer,
        timestamp: event.occurredAt,
        error: error instanceof Error ? error.message : String(error),
        detail: 'outbox record failed (business operation unaffected)',
      });
    }
  }
}
