import { v4 as uuidv4 } from 'uuid';
import type { DomainEvent, EventActor } from '@/domain/events/DomainEvent';

/**
 * Factory for constructing a standardized DomainEvent envelope.
 *
 * Responsible for the envelope fields that are always machine-generated:
 *   - eventId    (fresh UUID v4)
 *   - version    (defaults to 1)
 *   - occurredAt (defaults to now, ISO 8601)
 *
 * The caller supplies the domain-meaningful fields (type, aggregate, payload,
 * correlation/causation, producer, actor).
 *
 * Correlation semantics (Rule 11): a workflow generates a correlationId at its
 * entry point and propagates it. When `correlationId` is omitted a fresh one is
 * generated. `causationId` links a child event to the event that caused it and
 * defaults to '' (no parent).
 */
export interface CreateDomainEventInput<TPayload> {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  producer: string;
  payload: TPayload;
  actor?: EventActor;
  correlationId?: string;
  causationId?: string;
  version?: number;
  occurredAt?: string;
  eventId?: string;
}

export function createDomainEvent<TPayload>(
  input: CreateDomainEventInput<TPayload>,
): DomainEvent<TPayload> {
  return {
    eventId: input.eventId ?? uuidv4(),
    eventType: input.eventType,
    version: input.version ?? 1,
    aggregateId: input.aggregateId,
    aggregateType: input.aggregateType,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    correlationId: input.correlationId ?? uuidv4(),
    causationId: input.causationId ?? '',
    producer: input.producer,
    actor: input.actor ?? { role: 'SYSTEM' },
    payload: input.payload,
  };
}

/** Generate a new correlation id for a workflow entry point. */
export function newCorrelationId(): string {
  return uuidv4();
}
