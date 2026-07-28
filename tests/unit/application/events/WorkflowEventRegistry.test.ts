import { describe, it, expect, vi } from 'vitest';
import { WorkflowEventRegistry } from '@/application/events/WorkflowEventRegistry';
import type { WorkflowEvent, WorkflowEventSubscriber } from '@/application/events';

function createSubscriber(eventTypes: string[]): WorkflowEventSubscriber {
  return {
    eventTypes,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe('WorkflowEventRegistry', () => {
  it('subscribes and retrieves subscribers by event type', () => {
    const registry = new WorkflowEventRegistry();
    const subscriber = createSubscriber(['ConsultationStarted']);
    registry.subscribe(subscriber);

    const handlers = registry.getSubscribers('ConsultationStarted');
    expect(handlers).toContain(subscriber);
  });

  it('does not retrieve subscribers for non-matching event types', () => {
    const registry = new WorkflowEventRegistry();
    const subscriber = createSubscriber(['ConsultationStarted']);
    registry.subscribe(subscriber);

    const handlers = registry.getSubscribers('ConsultationCompleted');
    expect(handlers).toHaveLength(0);
  });

  it('unsubscribes correctly', () => {
    const registry = new WorkflowEventRegistry();
    const subscriber = createSubscriber(['ConsultationStarted']);
    registry.subscribe(subscriber);
    registry.unsubscribe(subscriber);

    const handlers = registry.getSubscribers('ConsultationStarted');
    expect(handlers).toHaveLength(0);
  });

  it('clears all subscriptions', () => {
    const registry = new WorkflowEventRegistry();
    registry.subscribe(createSubscriber(['ConsultationStarted']));
    registry.subscribe(createSubscriber(['ConsultationCompleted']));
    registry.clear();

    expect(registry.getSubscribers('ConsultationStarted')).toHaveLength(0);
    expect(registry.getSubscribers('ConsultationCompleted')).toHaveLength(0);
  });

  it('handles multiple subscribers for same event type', () => {
    const registry = new WorkflowEventRegistry();
    const subscriberA = createSubscriber(['ConsultationStarted']);
    const subscriberB = createSubscriber(['ConsultationStarted']);
    registry.subscribe(subscriberA);
    registry.subscribe(subscriberB);

    const handlers = registry.getSubscribers('ConsultationStarted');
    expect(handlers).toContain(subscriberA);
    expect(handlers).toContain(subscriberB);
  });

  it('handles subscriber with multiple event types', () => {
    const registry = new WorkflowEventRegistry();
    const subscriber = createSubscriber(['ConsultationStarted', 'ConsultationCompleted']);
    registry.subscribe(subscriber);

    expect(registry.getSubscribers('ConsultationStarted')).toContain(subscriber);
    expect(registry.getSubscribers('ConsultationCompleted')).toContain(subscriber);
  });
});
