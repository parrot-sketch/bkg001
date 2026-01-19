/**
 * Service Interface: IEventPublisher
 * 
 * Defines the contract for publishing domain events.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Domain events represent important state changes that may trigger side effects
 * such as notifications, audit logging, or integration with external systems.
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IEventPublisher {
  /**
   * Publishes a domain event
   * 
   * @param event - The domain event to publish
   * @returns Promise that resolves when the event is published
   * @throws Error if publishing fails
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events atomically
   * 
   * @param events - Array of domain events to publish
   * @returns Promise that resolves when all events are published
   * @throws Error if publishing fails
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string | number;
  readonly eventType: string;
}
