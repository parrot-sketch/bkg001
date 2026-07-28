import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TimerContextProvider, useTimerContext } from '@/providers/timer/TimerContextProvider';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';

function wrapper(
  props: {
    startedAt?: Date | string | null;
    slotStartTime?: Date | null;
    slotDurationMinutes?: number | null;
    children: React.ReactNode;
  } = { children: null as any }
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryWrapper>
        <TimerContextProvider
          startedAt={props.startedAt}
          slotStartTime={props.slotStartTime}
          slotDurationMinutes={props.slotDurationMinutes}
        >
          {children}
        </TimerContextProvider>
      </QueryWrapper>
    );
  };
}

describe('TimerContextProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null elapsed when no startedAt', () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.elapsed).toBeNull();
    expect(result.current.timeInfo).toBeNull();
    expect(result.current.remainingDisplay).toBeNull();
  });

  it('computes elapsed time', async () => {
    const startedAt = new Date(Date.now() - 65_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt }),
    });

    expect(result.current.elapsed).toBe('1:05');
  });

  it('formats hours when elapsed > 1 hour', async () => {
    const startedAt = new Date(Date.now() - 3_600_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt }),
    });

    expect(result.current.elapsed).toBe('1h 00m');
  });

  it('computes timeInfo when slotStartTime and slotDurationMinutes are provided', async () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 30_000).toISOString();
    const slotStartTime = new Date(now.getTime() - 60_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt, slotStartTime, slotDurationMinutes: 30 }),
    });

    expect(result.current.timeInfo).not.toBeNull();
    expect(result.current.timeInfo?.percentUsed).toBeGreaterThanOrEqual(0);
    expect(result.current.timeInfo?.remainingMinutes).toBeGreaterThanOrEqual(0);
  });

  it('returns null timeInfo when slotStartTime or slotDurationMinutes is missing', async () => {
    const startedAt = new Date(Date.now() - 30_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt }),
    });

    expect(result.current.timeInfo).toBeNull();
    expect(result.current.remainingDisplay).toBeNull();
  });

  it('computes remaining display when timeInfo is available', async () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 5_000).toISOString();
    const slotStartTime = new Date(now.getTime() - 10_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt, slotStartTime, slotDurationMinutes: 30 }),
    });

    expect(result.current.remainingDisplay).not.toBeNull();
    expect(result.current.remainingDisplay).toMatch(/left|over|Time/);
  });

  it('updates elapsed time on interval', async () => {
    const startedAt = new Date(Date.now() - 5_000).toISOString();

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt }),
    });

    const initial = result.current.elapsed;
    expect(initial).toBe('0:05');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.elapsed).toBe('0:06');
  });

  it('does not update when startedAt is null', async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: wrapper({ startedAt: null }),
    });

    expect(result.current.elapsed).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsed).toBeNull();
  });

  it('throws error when used outside provider', async () => {
    expect(() => {
      renderHook(() => useTimerContext());
    }).toThrow('useTimerContext must be used within TimerContextProvider');
  });
});
