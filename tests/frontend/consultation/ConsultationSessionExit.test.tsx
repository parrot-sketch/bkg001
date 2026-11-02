import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { ConsultationSessionContent } from '@/app/doctor/consultations/session/[appointmentId]/ConsultationSessionContent';
import { DocumentationProvider, useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { TimerContextProvider } from '@/providers/timer/TimerContextProvider';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

type SaveResult = { success: true; version: string };
type SaveHandler = (
  notes: StructuredNotes,
  outcomeType: null,
  patientDecision: null,
) => Promise<SaveResult>;

const CHARGE_SHEET = '/doctor/patients/patient-1?tab=charges';
const DASHBOARD = '/doctor/dashboard';

const push = vi.hoisted(() => vi.fn());
const patientRef = vi.hoisted(() => ({
  current: { id: 'patient-1', firstName: 'Ada', lastName: 'Lovelace' } as {
    id: string;
    firstName: string;
    lastName: string;
  } | null,
}));
const consultationRef = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
const docsApi = vi.hoisted(() => ({
  current: null as {
    notes: StructuredNotes;
    isDirty: boolean;
    updateNotes: (field: keyof StructuredNotes, value: string) => void;
  } | null,
}));

const loadWaitingQueue = vi.fn();
const refetchQueue = vi.fn(async () => undefined);
const completeConsultation = vi.fn(async () => undefined);
const switchToPatient = vi.fn(async () => undefined);

const INITIAL_NOTES: StructuredNotes = {
  chiefComplaint: '',
  examination: '',
  assessment: '',
  plan: '',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/actions/doctor/consultation-session', () => ({
  startSession: vi.fn(),
}));

vi.mock('@/providers/patient/PatientContextProvider', () => ({
  usePatientContext: () => ({
    patient: patientRef.current,
    vitals: null,
    refreshPatient: vi.fn(),
  }),
}));

vi.mock('@/contexts/ConsultationContext', () => ({
  useConsultationContext: () => {
    if (!consultationRef.current) throw new Error('Missing consultation context');
    return consultationRef.current;
  },
}));

vi.mock('@/components/consultation/room/PatientPanel', () => ({
  PatientPanel: () => null,
}));

vi.mock('@/components/consultation/ClinicalRichTextEditor', () => ({
  ClinicalRichTextEditor: ({
    content,
    onChange,
    ariaLabel,
    readOnly,
  }: {
    content: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
    readOnly?: boolean;
  }) => (
    <textarea
      aria-label={ariaLabel}
      readOnly={readOnly}
      value={content}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function Bridge({ isReadOnly }: { isReadOnly: boolean }) {
  const docs = useDocumentationContext();
  docsApi.current = docs;
  consultationRef.current = {
    state: {
      notes: docs.notes,
      isSaving: docs.isSaving,
      autoSaveStatus: docs.autoSaveStatus,
      appointment: { id: 41, status: isReadOnly ? 'COMPLETED' : 'IN_CONSULTATION' },
      doctorId: 'doctor-1',
    },
    isReadOnly,
    canSave: docs.canSave,
    saveDraft: docs.saveDraft,
    updateNotes: docs.updateNotes,
    completeConsultation,
    switchToPatient,
    waitingQueue: [],
    refetchQueue,
    isQueueRefetching: false,
    queueReady: true,
    loadWaitingQueue,
  };
  return <ConsultationSessionContent />;
}

function renderRoom(isReadOnly: boolean, onSaveDraft: SaveHandler) {
  return render(
    <TimerContextProvider>
      <DocumentationProvider
        appointmentId={41}
        consultationId={9}
        doctorId="doctor-1"
        notes={INITIAL_NOTES}
        onSaveDraft={onSaveDraft}
      >
        <Bridge isReadOnly={isReadOnly} />
      </DocumentationProvider>
    </TimerContextProvider>,
  );
}

function clickBack() {
  const button = document.querySelector('header button');
  if (!button) throw new Error('Back button missing');
  fireEvent.click(button);
}

function clickLeave() {
  fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
}

function clickChargeSheet() {
  fireEvent.click(screen.getByRole('button', { name: 'Open charge sheet' }));
}

function makeDirty(value: string, readOnly: boolean) {
  if (readOnly) {
    act(() => {
      docsApi.current?.updateNotes('chiefComplaint', value);
    });
    return;
  }
  fireEvent.change(screen.getByLabelText('Medical History notes'), { target: { value } });
}

function heldSave() {
  const seen: string[] = [];
  let release: (value: SaveResult) => void = () => undefined;
  const onSaveDraft: SaveHandler = vi.fn(async (notes) => {
    seen.push(notes.chiefComplaint ?? '');
    return new Promise<SaveResult>((resolve) => {
      release = resolve;
    });
  });
  return {
    seen,
    onSaveDraft,
    release: () => release({ success: true, version: '1' }),
  };
}

describe('consultation room exit navigation', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(toast.error).mockClear();
    patientRef.current = { id: 'patient-1', firstName: 'Ada', lastName: 'Lovelace' };
    consultationRef.current = null;
    docsApi.current = null;
    completeConsultation.mockClear();
    loadWaitingQueue.mockClear();
  });

  it('saves dirty notes before Back opens the charge sheet', async () => {
    const save = heldSave();
    renderRoom(false, save.onSaveDraft);
    makeDirty('Unsaved headache', false);

    clickBack();

    expect(save.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(save.seen).toEqual(['Unsaved headache']);
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      save.release();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(CHARGE_SHEET);
  });

  it('saves dirty notes before Leave returns to the dashboard', async () => {
    const save = heldSave();
    renderRoom(true, save.onSaveDraft);
    makeDirty('Unsaved headache', true);

    clickLeave();

    expect(save.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(save.seen).toEqual(['Unsaved headache']);
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      save.release();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(DASHBOARD);
  });

  it('saves dirty notes before the charge sheet opens', async () => {
    const save = heldSave();
    renderRoom(true, save.onSaveDraft);
    makeDirty('Unsaved headache', true);

    clickChargeSheet();

    expect(save.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(save.seen).toEqual(['Unsaved headache']);
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      save.release();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(CHARGE_SHEET);
  });

  it('opens Back, Leave, and the charge sheet without a write when the note is clean', async () => {
    const onSaveDraft = vi.fn();
    let view = renderRoom(false, onSaveDraft);

    clickBack();
    await waitFor(() => expect(push).toHaveBeenCalledWith(CHARGE_SHEET));
    expect(onSaveDraft).not.toHaveBeenCalled();

    view.unmount();
    push.mockClear();
    patientRef.current = null;
    view = renderRoom(false, onSaveDraft);
    clickBack();
    await waitFor(() => expect(push).toHaveBeenCalledWith(DASHBOARD));
    expect(onSaveDraft).not.toHaveBeenCalled();

    view.unmount();
    push.mockClear();
    patientRef.current = { id: 'patient-1', firstName: 'Ada', lastName: 'Lovelace' };
    view = renderRoom(true, onSaveDraft);
    clickLeave();
    await waitFor(() => expect(push).toHaveBeenCalledWith(DASHBOARD));
    clickChargeSheet();
    await waitFor(() => expect(push).toHaveBeenCalledWith(CHARGE_SHEET));
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(2);
  });

  it.each([
    { label: 'Back', readOnly: false, click: clickBack, destination: CHARGE_SHEET },
    { label: 'Leave', readOnly: true, click: clickLeave, destination: DASHBOARD },
    { label: 'charge sheet', readOnly: true, click: clickChargeSheet, destination: CHARGE_SHEET },
  ])('blocks $label when the save fails and allows a retry', async ({ readOnly, click, destination }) => {
    let fail = true;
    const onSaveDraft: SaveHandler = vi.fn(async () => {
      if (fail) throw new Error('Network error');
      return { success: true, version: '2' };
    });
    renderRoom(readOnly, onSaveDraft);
    makeDirty('Keep this', readOnly);

    click();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network error'));
    expect(push).not.toHaveBeenCalled();
    expect(docsApi.current?.notes.chiefComplaint).toBe('Keep this');
    expect(docsApi.current?.isDirty).toBe(true);
    if (!readOnly) {
      expect(screen.getByLabelText('Medical History notes')).toHaveValue('Keep this');
    } else {
      expect(screen.getByRole('button', { name: 'Open charge sheet' })).toBeInTheDocument();
    }

    fail = false;
    click();

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(destination);
    expect(onSaveDraft).toHaveBeenCalledTimes(2);
  });

  it('lets one exit proceed when Back and Leave are clicked together', async () => {
    const save = heldSave();
    renderRoom(true, save.onSaveDraft);
    makeDirty('Unsaved headache', true);

    clickChargeSheet();
    clickLeave();
    clickBack();

    expect(save.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(completeConsultation).not.toHaveBeenCalled();

    await act(async () => {
      save.release();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(CHARGE_SHEET);
  });

  it('does not complete the consultation while an exit save is still running', async () => {
    const save = heldSave();
    renderRoom(false, save.onSaveDraft);
    makeDirty('Unsaved headache', false);

    clickBack();
    clickBack();
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    expect(save.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(completeConsultation).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      save.release();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(completeConsultation).not.toHaveBeenCalled();
  });

  it('persists an edit made during the exit save before navigating', async () => {
    const order: string[] = [];
    let releaseFirst: (value: SaveResult) => void = () => undefined;
    const onSaveDraft: SaveHandler = vi.fn(async (notes) => {
      const text = notes.chiefComplaint ?? '';
      order.push(`save:${text}`);
      if (order.length === 1) {
        return new Promise<SaveResult>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return { success: true, version: '2' };
    });
    push.mockImplementation((url: string) => {
      order.push(`nav:${url}`);
    });

    renderRoom(false, onSaveDraft);
    makeDirty('First', false);
    clickBack();
    expect(order).toEqual(['save:First']);

    makeDirty('Second', false);
    await act(async () => {
      releaseFirst({ success: true, version: '1' });
    });

    await waitFor(() => expect(order).toEqual(['save:First', 'save:Second', `nav:${CHARGE_SHEET}`]));
    expect(screen.getByLabelText('Medical History notes')).toHaveValue('Second');
  });

  it('keeps the note editor open when completion fails and allows another attempt', async () => {
    const onSaveDraft = vi.fn().mockResolvedValue({ success: true, version: '1' });
    completeConsultation.mockRejectedValueOnce(
      new Error('The consultation could not be completed because the clinical note was not saved. database unavailable'),
    );
    renderRoom(false, onSaveDraft);
    makeDirty('Keep this', false);
    await waitFor(() => expect(loadWaitingQueue).toHaveBeenCalled());
    const queueLoadsBefore = loadWaitingQueue.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/clinical note was not saved/),
    ));
    expect(screen.getByLabelText('Medical History notes')).toHaveValue('Keep this');
    expect(screen.queryByRole('heading', { name: 'Consultation complete' })).not.toBeInTheDocument();
    expect(loadWaitingQueue.mock.calls.length).toBe(queueLoadsBefore);
    expect(completeConsultation).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(completeConsultation).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Medical History notes')).toHaveValue('Keep this');
  });

  it('blocks navigation when the follow-up save fails and keeps the latest note for retry', async () => {
    const seen: string[] = [];
    let releaseFirst: (value: SaveResult) => void = () => undefined;
    let rejectSecond: (error: Error) => void = () => undefined;
    const onSaveDraft: SaveHandler = vi.fn(async (notes) => {
      seen.push(notes.chiefComplaint ?? '');
      if (seen.length === 1) {
        return new Promise<SaveResult>((resolve) => {
          releaseFirst = resolve;
        });
      }
      if (seen.length === 2) {
        return new Promise<SaveResult>((_, reject) => {
          rejectSecond = reject;
        });
      }
      return { success: true, version: '3' };
    });

    renderRoom(false, onSaveDraft);
    makeDirty('First', false);
    clickBack();
    makeDirty('Second', false);

    await act(async () => {
      releaseFirst({ success: true, version: '1' });
    });
    await waitFor(() => expect(seen).toEqual(['First', 'Second']));
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      rejectSecond(new Error('follow-up failed'));
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('follow-up failed'));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Medical History notes')).toHaveValue('Second');
    expect(docsApi.current?.isDirty).toBe(true);

    clickBack();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(CHARGE_SHEET);
    expect(seen).toEqual(['First', 'Second', 'Second']);
  });
});
