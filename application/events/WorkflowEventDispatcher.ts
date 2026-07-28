/**
 * Application Layer — Workflow Event Dispatcher
 *
 * Dispatches workflow events to registered subscribers through the event bus.
 */

import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';
import type { WorkflowEventSubscriber } from './WorkflowEventSubscriber';
import type { WorkflowEventBus } from './WorkflowEventBus';

export interface EventDispatchResult {
  readonly event: WorkflowEvent;
  readonly subscriberCount: number;
  readonly failures: readonly { readonly subscriber: WorkflowEventSubscriber; readonly error: unknown }[];
}

export class WorkflowEventDispatcher {
  constructor(private readonly eventBus: WorkflowEventBus) {}

  async dispatch(event: WorkflowEvent): Promise<EventDispatchResult> {
    let subscriberCount = 0;
    const failures: { subscriber: WorkflowEventSubscriber; error: unknown }[] = [];

    const handler: WorkflowEventSubscriber = {
      eventTypes: [event.type],
      execute: async () => {
        subscriberCount++;
      },
    };

    try {
      await this.eventBus.publish(event);
    } catch (error) {
      failures.push({ subscriber: handler, error });
    }

    return {
      event,
      subscriberCount,
      failures,
    };
  }
}
