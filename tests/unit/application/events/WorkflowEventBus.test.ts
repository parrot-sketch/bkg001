import { describe, it, expect, vi } from 'vitest';
import { InProcessWorkflowEventBus } from '@/application/events/WorkflowEventBus';
import type { WorkflowEvent } from '@/domain/workflows/WorkflowEvent';
import type { WorkflowEventSubscriber } from '@/application/events/WorkflowEventSubscriber';

function createEvent(type: string, payload: unknown = {}): WorkflowEvent {
  return {
    id: `event-${Date.now()}-${Math.random()}`,
    type,
    timestamp: Date.now(),
    correlationId: 'test-correlation',
    causationId: null,
    payload,
  };
}

describe('InProcessWorkflowEventBus', () => {
  it('dispatches events to matching subscribers', async () => {
    const bus = new InProcessWorkflowEventBus();
    const handler = vi.fn();
    const subscriber: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: handler,
    };
    bus.subscribe(subscriber);

    const event = createEvent('ConsultationStarted');
    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not dispatch to non-matching subscribers', async () => {
    const bus = new InProcessWorkflowEventBus();
    const handler = vi.fn();
    const subscriber: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationCompleted'],
      execute: handler,
    };
    bus.subscribe(subscriber);

    const event = createEvent('ConsultationStarted');
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('preserves order for sequential dispatch', async () => {
    const bus = new InProcessWorkflowEventBus({ preserveOrder: true });
    const order: number[] = [];
    const subscriberA: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: async () => { order.push(1); },
    };
    const subscriberB: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: async () => { order.push(2); },
    };
    bus.subscribe(subscriberA);
    bus.subscribe(subscriberB);

    const event = createEvent('ConsultationStarted');
    await bus.publish(event);

    expect(order).toEqual([1, 2]);
  });

  it('allows unsubscribing', async () => {
    const bus = new InProcessWorkflowEventBus();
    const handler = vi.fn();
    const subscriber: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: handler,
    };
    bus.subscribe(subscriber);
    bus.unsubscribe(subscriber);

    const event = createEvent('ConsultationStarted');
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles subscriber failures gracefully', async () => {
    const bus = new InProcessWorkflowEventBus();
    const subscriberA: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: async () => { throw new Error('fail'); },
    };
    const subscriberB: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: async () => {},
    };
    bus.subscribe(subscriberA);
    bus.subscribe(subscriberB);

    const event = createEvent('ConsultationStarted');
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it('clears all subscribers', async () => {
    const bus = new InProcessWorkflowEventBus();
    const handler = vi.fn();
    const subscriber: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted'],
      execute: handler,
    };
    bus.subscribe(subscriber);
    bus.clear();

    const event = createEvent('ConsultationStarted');
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles empty subscriber list', async () => {
    const bus = new InProcessWorkflowEventBus();
    const event = createEvent('ConsultationStarted');
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it('handles multiple event types per subscriber', async () => {
    const bus = new InProcessWorkflowEventBus();
    const handler = vi.fn();
    const subscriber: WorkflowEventSubscriber = {
      eventTypes: ['ConsultationStarted', 'ConsultationCompleted'],
      execute: handler,
    };
    bus.subscribe(subscriber);

    await bus.publish(createEvent('ConsultationStarted'));
    await bus.publish(createEvent('ConsultationCompleted'));

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
