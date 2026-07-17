# Event Envelope

**Purpose:** Defines the standardized envelope for all domain events. This is the contract between event producers and consumers.

**Principle:** Define the interface first. Implementations (Postgres, Redis, Kafka) come later.

---

## Core Interfaces

```typescript
/**
 * Base interface for all domain events.
 * Every event in the system MUST implement this envelope.
 */
interface DomainEvent<TPayload> {
  // ── Identity ──
  eventId: string;           // UUID v4 - unique identifier for this event occurrence
  eventType: string;         // e.g., "intake.session.created", "patient.record.created"
  version: number;           // Schema version (starts at 1, incremented on breaking changes)

  // ── Aggregate Context ──
  aggregateId: string;       // ID of the aggregate that produced this event
  aggregateType: string;     // e.g., "IntakeSession", "Patient", "Appointment"

  // ── Temporal ──
  occurredAt: string;        // ISO 8601 timestamp when the event occurred

  // ── Causality ──
  correlationId: string;     // Groups all events in a single workflow/business transaction
  causationId: string;       // ID of the event that directly caused this event (if any)

  // ── Provenance ──
  producer: string;          // Service/component that produced the event
                               // e.g., "StartPatientIntakeUseCase", "ConfirmPatientIntakeUseCase"

  // ── Actor ──
  actor: {
    id?: string;             // User ID who triggered the event (if applicable)
    role?: string;           // Role of the actor (e.g., "FRONTDESK", "ADMIN", "PATIENT", "SYSTEM")
    ipAddress?: string;      // IP address of the actor
    userAgent?: string;      // User agent of the actor
  };

  // ── Payload ──
  payload: TPayload;         // Event-specific data (typed per event)
}
```

---

## Event Bus Interfaces

```typescript
/**
 * Event Publisher Interface
 * 
 * Implementations: LocalEventBus, PostgresEventBus, RedisEventBus, KafkaEventBus
 */
interface EventPublisher {
  /**
   * Publish a domain event
   * @param event The event to publish
   * @returns Promise that resolves when event is accepted (not necessarily delivered)
   */
  publish<T>(event: DomainEvent<T>): Promise<void>;

  /**
   * Publish multiple events atomically
   * @param events Array of events to publish
   * @returns Promise that resolves when all events are accepted
   */
  publishBatch<T>(events: DomainEvent<T>[]): Promise<void>;
}

/**
 * Event Subscriber Interface
 * 
 * Implementations: LocalEventBus, PostgresEventBus, RedisEventBus, KafkaEventBus
 */
interface EventSubscriber {
  /**
   * Subscribe to events of a specific type
   * @param eventType The event type to subscribe to (e.g., "patient.created")
   * @param handler The function to call when event is received
   */
  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void;

  /**
   * Unsubscribe from events of a specific type
   * @param eventType The event type to unsubscribe from
   * @param handler The handler to remove
   */
  unsubscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void;

  /**
   * Start consuming events
   */
  start(): Promise<void>;

  /**
   * Stop consuming events
   */
  stop(): Promise<void>;
}

/**
 * Event Bus Interface (combines publisher and subscriber)
 */
interface EventBus extends EventPublisher, EventSubscriber {
  /**
   * Get current health status
   */
  getHealth(): Promise<{ healthy: boolean; pendingCount: number; errorCount: number }>;
}
```

---

## Example Event Types

```typescript
// ── Patient Events ──

interface PatientCreatedPayload {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
}

type PatientCreatedEvent = DomainEvent<PatientCreatedPayload>;

interface PatientUpdatedPayload {
  patientId: string;
  changedFields: string[];
  previousValues: Partial<PatientCreatedPayload>;
  newValues: Partial<PatientCreatedPayload>;
}

type PatientUpdatedEvent = DomainEvent<PatientUpdatedPayload>;

interface PatientApprovedPayload {
  patientId: string;
  approvedBy: string;
  approvedAt: string;
}

type PatientApprovedEvent = DomainEvent<PatientApprovedPayload>;

// ── Intake Events ──

interface IntakeSessionCreatedPayload {
  sessionId: string;
  createdBy: string;
  expiresAt: string;
  qrCodeUrl: string;
  minutesRemaining: number;
}

type IntakeSessionCreatedEvent = DomainEvent<IntakeSessionCreatedPayload>;

interface IntakeSubmissionCreatedPayload {
  submissionId: string;
  sessionId: string;
  patientName: string;
  email: string;
  phone: string;
  completenessScore: number;
}

type IntakeSubmissionCreatedEvent = DomainEvent<IntakeSubmissionCreatedPayload>;

interface IntakeConfirmedPayload {
  sessionId: string;
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  confirmedAt: string;
}

type IntakeConfirmedEvent = DomainEvent<IntakeConfirmedPayload>;

// ── Appointment Events ──

interface AppointmentCreatedPayload {
  appointmentId: number;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  source: string;
}

type AppointmentCreatedEvent = DomainEvent<AppointmentCreatedPayload>;

interface AppointmentConfirmedPayload {
  appointmentId: number;
  confirmedAt: string;
  confirmedBy: string;
}

type AppointmentConfirmedEvent = DomainEvent<AppointmentConfirmedPayload>;

interface PatientCheckedInPayload {
  appointmentId: number;
  patientId: string;
  checkedInAt: string;
  checkedInBy: string;
  lateArrival: boolean;
  lateByMinutes?: number;
}

type PatientCheckedInEvent = DomainEvent<PatientCheckedInPayload>;

// ── Consultation Events ──

interface ConsultationStartedPayload {
  consultationId: number;
  appointmentId: number;
  doctorId: string;
  patientId: string;
  startedAt: string;
}

type ConsultationStartedEvent = DomainEvent<ConsultationStartedPayload>;

interface ConsultationCompletedPayload {
  consultationId: number;
  appointmentId: number;
  doctorId: string;
  patientId: string;
  outcome: string;
  outcomeType: string;
  patientDecision: string;
  followUpDate?: string;
  completedAt: string;
}

type ConsultationCompletedEvent = DomainEvent<ConsultationCompletedPayload>;

// ── Payment Events ──

interface PaymentReceivedPayload {
  paymentId: number;
  patientId: string;
  appointmentId?: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  receivedBy: string;
}

type PaymentReceivedEvent = DomainEvent<PaymentReceivedPayload>;

interface InvoiceCreatedPayload {
  paymentId: number;
  patientId: string;
  appointmentId?: number;
  totalAmount: number;
  billType: string;
  billDate: string;
}

type InvoiceCreatedEvent = DomainEvent<InvoiceCreatedPayload>;
```

---

## Event Envelope Validation

```typescript
/**
 * Validates a domain event envelope
 * @throws Error if event is invalid
 */
function validateDomainEvent(event: DomainEvent<any>): void {
  if (!event.eventId || !isValidUUID(event.eventId)) {
    throw new Error(`Invalid eventId: ${event.eventId}`);
  }
  if (!event.eventType || !isValidEventType(event.eventType)) {
    throw new Error(`Invalid eventType: ${event.eventType}`);
  }
  if (!event.aggregateId || !isValidUUID(event.aggregateId)) {
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
}

/**
 * Validates event type format
 * Pattern: domain.action.object (e.g., patient.created)
 */
function isValidEventType(eventType: string): boolean {
  const pattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
  return pattern.test(eventType);
}

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
}

/**
 * Validates ISO 8601 timestamp
 */
function isValidISO8601(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}
```

---

## Event Bus Implementations (Planned)

### LocalEventBus (In-Memory, for Testing)

```typescript
class LocalEventBus implements EventBus {
  private handlers: Map<string, Set<(event: any) => Promise<void>>> = new Map();
  private eventLog: DomainEvent<any>[] = [];

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    validateDomainEvent(event);
    this.eventLog.push(event);
    
    const handlers = this.handlers.get(event.eventType) || new Set();
    await Promise.all(handlers.map(handler => handler(event)));
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  unsubscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  async start(): Promise<void> { /* no-op */ }
  async stop(): Promise<void> { /* no-op */ }
}
```

### PostgresEventBus (Using LISTEN/NOTIFY)

```typescript
class PostgresEventBus implements EventBus {
  // Uses PostgreSQL LISTEN/NOTIFY for real-time notifications
  // Events persisted to outbox_event table for durability
  
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    // 1. Persist to outbox_event table within transaction
    // 2. NOTIFY channel with eventId
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    // Listen on PostgreSQL channel
    // Filter by eventType
    // Call handler for matching events
  }
}
```

### RedisEventBus (Production)

```typescript
class RedisEventBus implements EventBus {
  // Uses Redis Pub/Sub for real-time notifications
  // Events persisted to outbox_event table for durability
  
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    // 1. Persist to outbox_event table within transaction
    // 2. Publish to Redis channel
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    // Subscribe to Redis pattern channel
    // Filter by eventType
    // Call handler for matching events
  }
}
```

---

## Event Serialization

```typescript
/**
 * Serialize event to JSON for storage/transmission
 */
function serializeEvent<T>(event: DomainEvent<T>): string {
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

/**
 * Deserialize event from JSON
 */
function deserializeEvent<T>(json: string): DomainEvent<T> {
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
    actor: data.actor,
    payload: data.payload,
  };
}
```

---

## Open Questions

1. **Event Size Limit:** Should we enforce a strict 10KB limit? What about events with large payloads (e.g., clinical notes)?
2. **Binary Events:** Should we support Protobuf/Avro for high-volume events? When does JSON become insufficient?
3. **Event Compression:** Should events be compressed before storage? Gzip? Snappy?
4. **Event Encryption:** Should sensitive events (patient data) be encrypted at the event level?
5. **Event TTL:** Should events expire after a certain time? Or be archived to cold storage?
