/**
 * Application Layer — Workflow Event Registry
 *
 * Registry for workflow event subscribers.
 * Maps event types to subscriber lists.
 */

import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';
import type { WorkflowEventSubscriber } from './WorkflowEventSubscriber';

export class WorkflowEventRegistry {
  private readonly handlers = new Map<string, Set<WorkflowEventSubscriber>>();

  subscribe(subscriber: WorkflowEventSubscriber): void {
    for (const eventType of subscriber.eventTypes) {
      const handlers = this.handlers.get(eventType) ?? new Set<WorkflowEventSubscriber>();
      handlers.add(subscriber);
      this.handlers.set(eventType, handlers);
    }
  }

  unsubscribe(subscriber: WorkflowEventSubscriber): void {
    for (const eventType of subscriber.eventTypes) {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(subscriber);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    }
  }

  getSubscribers(eventType: string): readonly WorkflowEventSubscriber[] {
    return Array.from(this.handlers.get(eventType) ?? []);
  }

  clear(): void {
    this.handlers.clear();
  }
}
