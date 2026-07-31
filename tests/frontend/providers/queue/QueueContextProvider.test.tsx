import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/doctor/useDoctorQueue', () => ({
  useDoctorQueue: vi.fn(),
}));

import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';
import { QueueContextProvider, useQueueContext } from '@/providers/queue/QueueContextProvider';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';
import { useDoctorQueue } from '@/hooks/doctor/useDoctorQueue';

const makeQueueEntry = (id: number, status: string, appointmentId: number | null = null, overrides: Partial<QueuePatient> = {}): QueuePatient => ({
  id,
  patientId: '1',
  patient: {
    id: '1',
    firstName: 'Test',
    lastName: 'Patient',
    fileNumber: 'FN-001',
  },
  appointmentId,
  appointmentDate: new Date().toISOString(),
  time: '10:00',
  type: 'CONSULTATION',
  status,
  addedAt: new Date().toISOString(),
  waitTime: '0m',
  notes: null,
  isWalkIn: !appointmentId,
  ...overrides,
});

const sampleQueue: QueuePatient[] = [
  makeQueueEntry(1, 'CHECKED_IN', 101),
  makeQueueEntry(2, 'READY_FOR_CONSULTATION', 102),
  makeQueueEntry(3, 'IN_CONSULTATION', 103),
  makeQueueEntry(4, 'WAITING', 104),
  makeQueueEntry(5, 'COMPLETED', 105),
];

function wrapper(props: { doctorId?: string | null; currentAppointmentId?: number | null; children: React.ReactNode }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryWrapper>
        <QueueContextProvider
          doctorId={props.doctorId ?? 'doc-1'}
          currentAppointmentId={props.currentAppointmentId ?? null}
        >
          {children}
        </QueueContextProvider>
      </QueryWrapper>
    );
  };
}

describe('QueueContextProvider', () => {
  const mockUseDoctorQueueHook = vi.mocked(useDoctorQueue);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.waitingQueue).toEqual([]);
    expect(result.current.isQueueRefetching).toBe(false);
  });

  it('computes waitingQueue from queue entries', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: sampleQueue,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.waitingQueue).toHaveLength(4);
    expect(result.current.waitingQueue.map(q => q.id)).toEqual([1, 2, 3, 4]);
  });

  it('excludes current appointment from waitingQueue', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: sampleQueue,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({ currentAppointmentId: 103 }),
    });

    expect(result.current.waitingQueue).toHaveLength(3);
    expect(result.current.waitingQueue.map(q => q.id)).toEqual([1, 2, 4]);
  });

  it('filters active queue statuses', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: sampleQueue,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.waitingQueue.every(q => 
      q.status === 'WAITING' || q.status === 'CHECKED_IN' || q.status === 'READY_FOR_CONSULTATION' || q.status === 'IN_CONSULTATION'
    )).toBe(true);
    expect(result.current.waitingQueue.every(q => q.status !== 'COMPLETED')).toBe(true);
  });

  it('delegates refetchQueue to hook', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch,
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    await act(async () => {
      await result.current.refetchQueue();
    });

    expect(refetch).toHaveBeenCalled();
  });

  it('delegates isQueueRefetching to hook', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch: vi.fn(),
      isRefetching: true,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.isQueueRefetching).toBe(true);
  });

  it('loads waiting queue on first call', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch,
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    await act(async () => {
      result.current.loadWaitingQueue();
    });

    expect(refetch).toHaveBeenCalled();
  });

  it('does not refetch when already loaded', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch,
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    await act(async () => {
      result.current.loadWaitingQueue();
    });

    await act(async () => {
      result.current.loadWaitingQueue();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty queue when doctorId is null', async () => {
    mockUseDoctorQueueHook.mockReturnValue({
      data: [],
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({ doctorId: null }),
    });

    expect(result.current.waitingQueue).toEqual([]);
  });

  it('throws error when used outside provider', async () => {
    expect(() => {
      renderHook(() => useQueueContext());
    }).toThrow('useQueueContext must be used within QueueContextProvider');
  });
});