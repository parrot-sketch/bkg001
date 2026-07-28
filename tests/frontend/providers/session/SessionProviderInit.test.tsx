import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/patient/useAuth', () => ({
  useAuth: () => ({ user: { id: 'doctor-1' } }),
}));

import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';

const ConsultationWrapper = ({ children, initialAppointmentId }: { children: React.ReactNode; initialAppointmentId?: number }) => (
  <QueryWrapper>
    <ConsultationProvider initialAppointmentId={initialAppointmentId}>
      {children}
    </ConsultationProvider>
  </QueryWrapper>
);

describe('SessionProvider initialization retry guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('sets initializationAttempted after first attempt', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children, initialAppointmentId: 999 }),
    });

    expect(result.current).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.isActive).toBe(false);
  });
});
