import React from 'react';
import { render, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider, useSessionContext } from '@/providers/session/SessionProvider';
import { useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { QueryWrapper } from '../../mocks/react-query';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

vi.mock('@/actions/doctor/consultation-session', () => ({
  initializeSession: vi.fn(),
  startSession: vi.fn(),
  completeSession: vi.fn(),
  resumeSession: vi.fn(),
  cancelCompletion: vi.fn(),
  switchToPatient: vi.fn(),
  advanceQueue: vi.fn(),
  sendHeartbeat: vi.fn(),
  saveDraft: vi.fn(),
  saveCompletedNotes: vi.fn(),
  refreshPatient: vi.fn(),
  refreshVitals: vi.fn(),
}));

import { saveDraft, startSession, switchToPatient } from '@/actions/doctor/consultation-session';

const api: {
  docs: ReturnType<typeof useDocumentationContext> | null;
  session: ReturnType<typeof useSessionContext> | null;
} = { docs: null, session: null };

function Probe() {
  api.docs = useDocumentationContext();
  api.session = useSessionContext();
  return null;
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    appointment: {
      id: 14,
      patientId: 'p1',
      doctorId: 'doc-1',
      status: 'CHECKED_IN',
      appointmentDate: '2026-10-26',
      time: '09:00',
      type: 'Consultation',
    },
    patient: {
      id: 'p1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      fileNumber: '1',
      dateOfBirth: '',
      gender: '',
      phone: '',
    },
    vitals: null,
    consultation: null,
    doctorId: 'doc-1',
    workflowState: 'READY',
    isDirty: false,
    draftAvailable: false,
    notes: { chiefComplaint: '', examination: '', assessment: '', plan: '' },
    outcomeType: null,
    patientDecision: null,
    ...overrides,
  };
}

function openedSession(appointmentId: number, consultationId: number) {
  return session({
    appointment: {
      id: appointmentId,
      patientId: 'p2',
      doctorId: 'doc-1',
      status: 'IN_CONSULTATION',
      appointmentDate: '2026-10-26',
      time: '09:30',
      type: 'Consultation',
    },
    consultation: { id: consultationId, state: 'IN_PROGRESS', startedAt: '2026-10-26T06:30:00.000Z' },
    workflowState: 'ACTIVE',
  });
}

function renderRoom(initialSession: ReturnType<typeof session>) {
  return render(
    <QueryWrapper>
      <SessionProvider
        initialSession={initialSession as any}
        user={{ id: 'user-1', email: 'doctor@example.com', role: 'DOCTOR' as any }}
      >
        <Probe />
      </SessionProvider>
    </QueryWrapper>,
  );
}

describe('SessionProvider starts an open visit before saving', () => {
  beforeEach(() => {
    api.docs = null;
    api.session = null;
    vi.mocked(startSession).mockReset();
    vi.mocked(saveDraft).mockReset();
    vi.mocked(switchToPatient).mockReset();
    vi.mocked(saveDraft).mockResolvedValue({ success: true, data: { version: '1' } } as any);
  });

  it('starts the consultation and then saves the notes that are already on screen', async () => {
    vi.mocked(startSession).mockResolvedValue({
      success: true,
      data: { session: openedSession(14, 99) },
    } as any);

    renderRoom(session());

    await act(async () => {
      api.docs!.updateNotes('chiefComplaint', 'Headache');
    });
    await act(async () => {
      await api.docs!.saveDraft();
    });

    expect(startSession).toHaveBeenCalledWith(14, 'doc-1');
    expect(saveDraft).toHaveBeenCalledWith(
      14,
      99,
      expect.objectContaining({ chiefComplaint: 'Headache' }),
      null,
      null,
    );
    expect(api.session!.consultation?.id).toBe(99);
  });

  it('starts the destination visit when the live queue loads a patient who has no consultation', async () => {
    vi.mocked(switchToPatient).mockResolvedValue({
      success: true,
      data: {
        nextSession: { session: session({ appointment: { ...session().appointment, id: 22, status: 'CHECKED_IN' } }) },
        invalidationInstructions: [],
      },
    } as any);
    vi.mocked(startSession).mockResolvedValue({
      success: true,
      data: { session: openedSession(22, 77) },
    } as any);

    renderRoom(session({
      consultation: { id: 5, state: 'IN_PROGRESS', startedAt: '2026-10-26T06:00:00.000Z' },
      workflowState: 'ACTIVE',
    }));

    await act(async () => {
      await api.session!.switchToPatient(22);
    });

    expect(switchToPatient).toHaveBeenCalledWith(14, 22);
    expect(startSession).toHaveBeenCalledWith(22, 'doc-1');
    expect(api.session!.consultation?.id).toBe(77);
    expect(api.session!.appointment?.id).toBe(22);
  });

  it('does not start a completed visit that has no consultation', async () => {
    renderRoom(session({
      appointment: { ...session().appointment, status: 'COMPLETED' },
    }));

    await act(async () => {
      api.docs!.updateNotes('chiefComplaint', 'Headache');
    });

    await expect(act(async () => {
      await api.docs!.saveDraft();
    })).rejects.toThrow('Start the consultation before saving notes');
    expect(startSession).not.toHaveBeenCalled();
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
