import { describe, it, expect, vi } from 'vitest';
import { runEncounterTransition } from '@/lib/consultation/encounterTransition';

describe('runEncounterTransition', () => {
  it('does not run the transition when the save fails', async () => {
    const transition = vi.fn().mockResolvedValue(undefined);
    const guard = { current: false };

    await expect(runEncounterTransition({
      guard,
      save: async () => {
        throw new Error('save failed');
      },
      transition,
    })).rejects.toThrow('save failed');

    expect(transition).not.toHaveBeenCalled();
    expect(guard.current).toBe(false);
  });

  it('runs one transition when two calls overlap a pending save', async () => {
    let release: () => void = () => undefined;
    const save = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const transition = vi.fn().mockResolvedValue(undefined);
    const secondTransition = vi.fn().mockResolvedValue(undefined);
    const guard = { current: false };

    const first = runEncounterTransition({ guard, save, transition });
    const second = runEncounterTransition({
      guard,
      save: vi.fn().mockResolvedValue(undefined),
      transition: secondTransition,
    });

    await expect(second).resolves.toBe('blocked');
    expect(secondTransition).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();

    release();
    await expect(first).resolves.toBe('completed');
    expect(save).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(guard.current).toBe(false);
  });

  it('allows a later transition after a failed save', async () => {
    const guard = { current: false };
    const failedTransition = vi.fn();
    await expect(runEncounterTransition({
      guard,
      save: async () => {
        throw new Error('save failed');
      },
      transition: failedTransition,
    })).rejects.toThrow('save failed');

    const transition = vi.fn().mockResolvedValue(undefined);
    await expect(runEncounterTransition({
      guard,
      save: async () => undefined,
      transition,
    })).resolves.toBe('completed');
    expect(failedTransition).not.toHaveBeenCalled();
    expect(transition).toHaveBeenCalledTimes(1);
  });
});
