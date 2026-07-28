/**
 * Application Layer — Workflow Event Subscriber
 *
 * Base subscriber interface and common subscriber implementations.
 */

import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';

export interface WorkflowEventSubscriber {
  readonly eventTypes: readonly string[];
  execute(event: WorkflowEvent): Promise<void>;
}

export class CallbackWorkflowEventSubscriber implements WorkflowEventSubscriber {
  readonly eventTypes: readonly string[];

  constructor(
    eventTypes: readonly string[],
    private readonly callback: (event: WorkflowEvent) => Promise<void>
  ) {
    this.eventTypes = eventTypes;
  }

  async execute(event: WorkflowEvent): Promise<void> {
    await this.callback(event);
  }
}
