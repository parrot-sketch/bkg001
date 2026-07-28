/**
 * Application Layer — Workflow Event Bus
 *
 * In-process event bus for workflow events.
 * Provides deterministic, ordered event dispatch with no framework dependencies.
 *
 * Responsibilities:
 * - Publishing workflow events
 * - Dispatching subscribers
 * - Preserving event order
 * - Guaranteeing deterministic delivery
 * - Isolating publishers from consumers
 *
 * Must not:
 * - Persist events
 * - Use WebSockets
 * - Perform HTTP
 * - Access React
 * - Know about Context
 */

import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';

export interface WorkflowEventSubscriber {
  readonly eventTypes: readonly string[];
  execute(event: WorkflowEvent): Promise<void>;
}

export interface WorkflowEventBus {
  publish(event: WorkflowEvent): Promise<void>;
  subscribe(subscriber: WorkflowEventSubscriber): void;
  unsubscribe(subscriber: WorkflowEventSubscriber): void;
  clear(): void;
}

export class InProcessWorkflowEventBus implements WorkflowEventBus {
  private readonly subscribers = new Set<WorkflowEventSubscriber>();

  constructor(private readonly options: { readonly preserveOrder: boolean } = { preserveOrder: true }) {}

  async publish(event: WorkflowEvent): Promise<void> {
    const handlers = Array.from(this.subscribers).filter((subscriber) =>
      subscriber.eventTypes.includes(event.type)
    );

    if (this.options.preserveOrder) {
      for (const subscriber of handlers) {
        try {
          await subscriber.execute(event);
        } catch {
          // continue to next subscriber
        }
      }
    } else {
      await Promise.all(handlers.map((subscriber) =>
        subscriber.execute(event).catch(() => {
          // ignore subscriber failures
        })
      ));
    }
  }

  subscribe(subscriber: WorkflowEventSubscriber): void {
    this.subscribers.add(subscriber);
  }

  unsubscribe(subscriber: WorkflowEventSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  clear(): void {
    this.subscribers.clear();
  }
}
