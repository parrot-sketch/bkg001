/**
 * Domain Event Envelope
 *
 * This file is the CODE contract that mirrors, exactly, the architecture
 * specification in:
 *   - architecture/02-event-catalog/event-envelope.md
 *   - architecture/00-principles/event-design-rules.md  (Rule 5)
 *
 * Principle (from event-envelope.md): "Define the interface first.
 * Implementations (Postgres, Redis, Kafka) come later."
 *
 * DOMAIN LAYER RULE: this module has NO framework/infrastructure dependencies.
 * It only describes the shape of events and the ports used to publish/consume
 * them. Concrete transports (LocalEventBus, Outbox, Redis, ...) live in the
 * infrastructure layer and depend on these interfaces — never the reverse.
 */

// ────────────────────────────────────────────────────────────────────────────
// Actor
// ────────────────────────────────────────────────────────────────────────────

/**
 * Who (or what) triggered the event.
 * All fields optional to support SYSTEM-originated and anonymous/public events
 * (e.g. a patient opening the public intake form).
 */
export interface EventActor {
  /** User ID who triggered the event (if applicable) */
  id?: string;
  /** Role of the actor, e.g. "FRONTDESK", "ADMIN", "PATIENT", "SYSTEM" */
  role?: string;
  /** IP address of the actor */
  ipAddress?: string;
  /** User agent of the actor */
  userAgent?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DomainEvent<TPayload>  — the standardized envelope
// ────────────────────────────────────────────────────────────────────────────

/**
 * Base interface for all domain events.
 * Every event in the system MUST implement this envelope.
 *
 * Matches architecture/02-event-catalog/event-envelope.md exactly.
 */
export interface DomainEvent<TPayload = unknown> {
  // ── Identity ──
  /** UUID v4 — unique identifier for this event occurrence */
  eventId: string;
  /** e.g. "intake.session.created", "patient.record.created" */
  eventType: string;
  /** Schema version (starts at 1, incremented on breaking changes) */
  version: number;

  // ── Aggregate Context ──
  /** ID of the aggregate that produced this event */
  aggregateId: string;
  /** e.g. "IntakeSession", "IntakeSubmission", "Patient" */
  aggregateType: string;

  // ── Temporal ──
  /** ISO 8601 timestamp when the event occurred */
  occurredAt: string;

  // ── Causality ──
  /** Groups all events in a single workflow / business transaction */
  correlationId: string;
  /** ID of the event that directly caused this event (empty string if none) */
  causationId: string;

  // ── Provenance ──
  /**
   * Service/component that produced the event,
   * e.g. "StartPatientIntakeUseCase", "ConfirmPatientIntakeUseCase".
   */
  producer: string;

  // ── Actor ──
  actor: EventActor;

  // ── Payload ──
  /** Event-specific data (typed per event) */
  payload: TPayload;
}

// ────────────────────────────────────────────────────────────────────────────
// Ports: Publisher / Subscriber / Bus
// (mirrors event-envelope.md "Event Bus Interfaces")
// ────────────────────────────────────────────────────────────────────────────

/**
 * Event Publisher Interface.
 *
 * Business code MUST depend on this port, never on a concrete bus/broker.
 * Implementations: LocalEventBus, (future) PostgresEventBus, RedisEventBus, ...
 */
export interface EventPublisher {
  /**
   * Publish a domain event.
   * @returns resolves when the event is accepted (not necessarily delivered).
   */
  publish<T>(event: DomainEvent<T>): Promise<void>;

  /**
   * Publish multiple events.
   */
  publishBatch<T>(events: DomainEvent<T>[]): Promise<void>;
}

/** Async event handler signature. */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Event Subscriber Interface.
 */
export interface EventSubscriber {
  /** Subscribe to events of a specific type (e.g. "patient.record.created"). */
  subscribe<T>(eventType: string, handler: EventHandler<T>): void;

  /** Unsubscribe a previously registered handler. */
  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void;

  /** Start consuming events. */
  start(): Promise<void>;

  /** Stop consuming events. */
  stop(): Promise<void>;
}

/** Combined Event Bus interface (publisher + subscriber). */
export interface EventBus extends EventPublisher, EventSubscriber {
  /** Current health snapshot. */
  getHealth(): Promise<EventBusHealth>;
}

export interface EventBusHealth {
  healthy: boolean;
  pendingCount: number;
  errorCount: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Event Recorder port (Transactional Outbox seam)
// ────────────────────────────────────────────────────────────────────────────

/**
 * The port used by business use cases to *record* domain events durably.
 *
 * Business use cases depend ONLY on this interface. In this pilot the concrete
 * implementation is the Transactional Outbox (OutboxService), which persists the
 * event so a background dispatcher can later publish it to the EventBus.
 *
 * Recording MUST only ever be invoked AFTER the business operation has
 * successfully persisted — never before commit.
 */
export interface EventRecorder {
  record<T>(event: DomainEvent<T>): Promise<void>;
  recordBatch<T>(events: DomainEvent<T>[]): Promise<void>;
}

// ────────────────────────────────────────────────────────────────────────────
// Validation (mirrors event-envelope.md "Event Envelope Validation")
// ────────────────────────────────────────────────────────────────────────────

/**
 * Validates event type format.
 * Pattern: domain.action(.object) (e.g. patient.created, intake.session.created)
 */
export function isValidEventType(eventType: string): boolean {
  const pattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
  return pattern.test(eventType);
}

/** Validates UUID format (any version). */
export function isValidUUID(uuid: string): boolean {
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
}

/** Validates ISO 8601 timestamp. */
export function isValidISO8601(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validates a domain event envelope.
 * @throws Error if the event is invalid.
 */
export function validateDomainEvent(event: DomainEvent<unknown>): void {
  if (!event.eventId || !isValidUUID(event.eventId)) {
    throw new Error(`Invalid eventId: ${event.eventId}`);
  }
  if (!event.eventType || !isValidEventType(event.eventType)) {
    throw new Error(`Invalid eventType: ${event.eventType}`);
  }
  if (!event.aggregateId || event.aggregateId.trim().length === 0) {
    throw new Error(`Invalid aggregateId: ${event.aggregateId}`);
  }
  if (!event.aggregateType || event.aggregateType.trim().length === 0) {
    throw new Error(`Invalid aggregateType: ${event.aggregateType}`);
  }
  if (!event.occurredAt || !isValidISO8601(event.occurredAt)) {
    throw new Error(`Invalid occurredAt: ${event.occurredAt}`);
  }
  if (!event.correlationId || !isValidUUID(event.correlationId)) {
    throw new Error(`Invalid correlationId: ${event.correlationId}`);
  }
  if (!event.producer || event.producer.trim().length === 0) {
    throw new Error(`Producer is required`);
  }
  if (typeof event.version !== 'number' || event.version < 1) {
    throw new Error(`Invalid version: ${event.version}`);
  }
  if (typeof event.causationId !== 'string') {
    throw new Error(`Invalid causationId: ${event.causationId}`);
  }
  if (!event.actor || typeof event.actor !== 'object') {
    throw new Error(`Actor is required`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Serialization (mirrors event-envelope.md "Event Serialization")
// ────────────────────────────────────────────────────────────────────────────

/** Serialize an event to JSON for storage/transmission. */
export function serializeEvent<T>(event: DomainEvent<T>): string {
  return JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    version: event.version,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    occurredAt: event.occurredAt,
    correlationId: event.correlationId,
    causationId: event.causationId,
    producer: event.producer,
    actor: event.actor,
    payload: event.payload,
  });
}

/** Deserialize an event from JSON. */
export function deserializeEvent<T = unknown>(json: string): DomainEvent<T> {
  const data = JSON.parse(json);
  return {
    eventId: data.eventId,
    eventType: data.eventType,
    version: data.version,
    aggregateId: data.aggregateId,
    aggregateType: data.aggregateType,
    occurredAt: data.occurredAt,
    correlationId: data.correlationId,
    causationId: data.causationId,
    producer: data.producer,
    actor: data.actor ?? {},
    payload: data.payload,
  };
}
