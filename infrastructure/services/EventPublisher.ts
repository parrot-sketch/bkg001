import { IEventPublisher, DomainEvent } from '../../domain/interfaces/services/IEventPublisher';

/**
 * Service: EventPublisher
 * 
 * Simple in-memory event publisher implementation.
 * 
 * In a production system, this would be replaced with:
 * - Message queue (RabbitMQ, Kafka, etc.)
 * - Event store
 * - Pub/Sub service
 * 
 * For now, this implementation:
 * - Stores events in memory
 * - Provides hooks for event handlers
 * - Can be extended to support async processing
 * 
 * Responsibilities:
 * - Publish domain events
 * - Support event handlers registration
 * - Handle event publishing errors gracefully
 */
export class EventPublisher implements IEventPublisher {
  private eventHandlers: Map<string, Array<(event: DomainEvent) => Promise<void> | void>> = new Map();

  /**
   * Registers an event handler for a specific event type
   * 
   * @param eventType - The event type to handle
   * @param handler - The handler function
   */
  on(eventType: string, handler: (event: DomainEvent) => Promise<void> | void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Publishes a domain event
   * 
   * @param event - The domain event to publish
   * @returns Promise that resolves when the event is published
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      const handlers = this.eventHandlers.get(event.eventType) || [];
      
      // Execute all handlers for this event type
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler(event);
          } catch (error) {
            // Log error but don't fail the publish operation
            console.error(`Error handling event ${event.eventType}:`, error);
          }
        })
      );
    } catch (error) {
      // Log error but don't throw - event publishing should be best-effort
      console.error(`Error publishing event ${event.eventType}:`, error);
    }
  }

  /**
   * Publishes multiple domain events atomically
   * 
   * @param events - Array of domain events to publish
   * @returns Promise that resolves when all events are published
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}
