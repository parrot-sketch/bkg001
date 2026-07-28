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

describe('SessionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('compatibility layer renders ConsultationContext', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children }),
    });

    expect(result.current).toBeDefined();
    expect(result.current.isActive).toBe(false);
    expect(result.current.isReadOnly).toBe(false);
    expect(typeof result.current.startConsultation).toBe('function');
    expect(typeof result.current.completeConsultation).toBe('function');
    expect(typeof result.current.switchToPatient).toBe('function');
    expect(typeof result.current.goToSurgeryPlanning).toBe('function');
  });

  it('compatibility layer exposes session state via context', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children }),
    });

    expect(result.current.state).toBeDefined();
    expect(result.current.state.appointment).toBeNull();
    expect(result.current.state.patient).toBeNull();
    expect(result.current.state.consultation).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
  });

  it('compatibility layer delegates dialog actions to DialogProvider', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children }),
    });

    expect(typeof result.current.closeStartDialog).toBe('function');
    expect(typeof result.current.openCompleteDialog).toBe('function');
    expect(typeof result.current.closeCompleteDialog).toBe('function');
  });

  it('compatibility layer loadAppointment delegates to initializeSession', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children }),
    });

    expect(typeof result.current.loadAppointment).toBe('function');
    expect(result.current.loadAppointment).toBeDefined();
  });

  it('compatibility layer preserves showStartDialog and showCompleteDialog', async () => {
    const { result } = renderHook(() => useConsultationContext(), {
      wrapper: ({ children }) => ConsultationWrapper({ children }),
    });

    expect(result.current.showStartDialog).toBe(false);
    expect(result.current.showCompleteDialog).toBe(false);
  });
});
