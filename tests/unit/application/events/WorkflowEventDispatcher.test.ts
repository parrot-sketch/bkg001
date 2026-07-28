import { describe, it, expect, vi } from 'vitest';
import { WorkflowEventDispatcher } from '@/application/events/WorkflowEventDispatcher';
import type { WorkflowEvent, WorkflowEventSubscriber } from '@/application/events';

function createEvent(type: string): WorkflowEvent {
  return {
    id: `event-${Date.now()}-${Math.random()}`,
    type,
    timestamp: Date.now(),
    correlationId: 'test-correlation',
    causationId: null,
    payload: {},
  };
}

describe('WorkflowEventDispatcher', () => {
  it('dispatches events through event bus', async () => {
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new WorkflowEventDispatcher(eventBus as any);

    const event = createEvent('ConsultationStarted');
    const result = await dispatcher.dispatch(event);

    expect(result.event.type).toBe('ConsultationStarted');
    expect(result.failures).toHaveLength(0);
    expect(eventBus.publish).toHaveBeenCalledWith(event);
  });

  it('returns empty result when event bus has no subscribers', async () => {
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new WorkflowEventDispatcher(eventBus as any);

    const event = createEvent('ConsultationStarted');
    const result = await dispatcher.dispatch(event);

    expect(result.subscriberCount).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  it('collects failures when event bus throws', async () => {
    const error = new Error('publish failed');
    const eventBus = { publish: vi.fn().mockRejectedValue(error) };
    const dispatcher = new WorkflowEventDispatcher(eventBus as any);

    const event = createEvent('ConsultationStarted');
    const result = await dispatcher.dispatch(event);

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toBe(error);
  });

  it('continues dispatching after publish succeeds', async () => {
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new WorkflowEventDispatcher(eventBus as any);

    const event = createEvent('ConsultationStarted');
    const result = await dispatcher.dispatch(event);

    expect(result.subscriberCount).toBe(0);
    expect(result.failures).toHaveLength(0);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});
