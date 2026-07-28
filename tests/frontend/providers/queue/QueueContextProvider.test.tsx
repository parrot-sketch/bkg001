import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/doctor/useDoctorDashboard', () => ({
  useDoctorTodayAppointments: vi.fn(),
}));

import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { QueueContextProvider, useQueueContext } from '@/providers/queue/QueueContextProvider';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';
import { useDoctorTodayAppointments } from '@/hooks/doctor/useDoctorDashboard';

const makeAppointment = (id: number, status: string, currentId: number | null = null): AppointmentResponseDto => ({
  id,
  patientId: '1',
  doctorId: 'doc-1',
  appointmentDate: new Date(),
  time: '10:00',
  status,
  type: 'CONSULTATION',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const sampleAppointments: AppointmentResponseDto[] = [
  makeAppointment(1, 'CHECKED_IN'),
  makeAppointment(2, 'READY_FOR_CONSULTATION'),
  makeAppointment(3, 'COMPLETED'),
  makeAppointment(4, 'SCHEDULED'),
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
  const mockUseDoctorTodayAppointmentsHook = vi.mocked(useDoctorTodayAppointments);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', async () => {
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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

  it('computes waitingQueue from appointments', async () => {
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
      data: sampleAppointments,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.waitingQueue).toHaveLength(2);
    expect(result.current.waitingQueue.map(a => a.id)).toEqual([1, 2]);
  });

  it('excludes current appointment from waitingQueue', async () => {
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
      data: sampleAppointments,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({ currentAppointmentId: 1 }),
    });

    expect(result.current.waitingQueue).toHaveLength(1);
    expect(result.current.waitingQueue[0].id).toBe(2);
  });

  it('filters only CHECKED_IN and READY_FOR_CONSULTATION statuses', async () => {
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
      data: sampleAppointments,
      refetch: vi.fn(),
      isRefetching: false,
    } as any);

    const { result } = renderHook(() => useQueueContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.waitingQueue.every(a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION')).toBe(true);
  });

  it('delegates refetchQueue to hook', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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
    mockUseDoctorTodayAppointmentsHook.mockReturnValue({
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
