import type { DomainEvent } from '@/domain/events/DomainEvent';

/**
 * Structured Event Logging (Deliverable 7 / Architecture Principle 9,
 * Event Design Rule 14 "Events Are Auditable").
 *
 * Every published / recorded / dispatched event emits a single-line structured
 * JSON log record containing at minimum:
 *   - Event Name      (eventType)
 *   - Aggregate       (aggregateType : aggregateId)
 *   - Correlation ID  (correlationId)
 *   - Producer        (producer)
 *   - Timestamp       (occurredAt)
 *   - Status          (lifecycle status of the event in the pipeline)
 *
 * Output is intentionally plain `console.*` so it is picked up by whatever log
 * drain the platform already uses (Vercel, Docker, etc.) with zero new infra.
 */

export type EventLogStatus =
  | 'RECORDED' // written to outbox
  | 'DISPATCHING' // picked up by dispatcher
  | 'PUBLISHED' // delivered to the event bus
  | 'PROCESSED' // outbox row marked processed
  | 'FAILED' // publication/handling failed
  | 'RETRY' // scheduled for retry
  | 'DEAD_LETTER' // exceeded max retries
  | 'DELIVERED' // delivered to a subscriber
  | 'HANDLER_ERROR'; // a subscriber handler threw

export interface EventLogFields {
  event: string; // Event Name
  aggregate: string; // Aggregate  (Type:Id)
  aggregateType: string;
  aggregateId: string;
  correlationId: string; // Correlation ID
  causationId?: string;
  producer: string; // Producer
  timestamp: string; // Timestamp (occurredAt)
  status: EventLogStatus; // Status
  eventId?: string;
  retryCount?: number;
  error?: string;
  detail?: string;
}

const LOG_PREFIX = '[event]';

function emit(fields: EventLogFields): void {
  const line = JSON.stringify({ scope: 'domain-event', ...fields });
  if (fields.status === 'FAILED' || fields.status === 'DEAD_LETTER' || fields.status === 'HANDLER_ERROR') {
    console.error(LOG_PREFIX, line);
  } else {
    console.info(LOG_PREFIX, line);
  }
}

/** Log a lifecycle transition for a fully-formed domain event. */
export function logEvent(
  event: DomainEvent<unknown>,
  status: EventLogStatus,
  extra?: { retryCount?: number; error?: string; detail?: string },
): void {
  emit({
    event: event.eventType,
    aggregate: `${event.aggregateType}:${event.aggregateId}`,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    producer: event.producer,
    timestamp: event.occurredAt,
    status,
    eventId: event.eventId,
    retryCount: extra?.retryCount,
    error: extra?.error,
    detail: extra?.detail,
  });
}

/**
 * Log a lifecycle transition when only a partial view (e.g. an outbox row) is
 * available and the full envelope could not be deserialized.
 */
export function logEventRaw(fields: Partial<EventLogFields> & { event: string; status: EventLogStatus }): void {
  emit({
    aggregate: fields.aggregate ?? 'unknown:unknown',
    aggregateType: fields.aggregateType ?? 'unknown',
    aggregateId: fields.aggregateId ?? 'unknown',
    correlationId: fields.correlationId ?? 'unknown',
    producer: fields.producer ?? 'unknown',
    timestamp: fields.timestamp ?? new Date().toISOString(),
    ...fields,
  });
}
