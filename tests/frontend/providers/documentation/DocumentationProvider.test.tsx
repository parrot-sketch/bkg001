import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DocumentationProvider, useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

const EMPTY: StructuredNotes = {
  chiefComplaint: '',
  examination: '',
  assessment: '',
  plan: '',
};

type HarnessProps = {
  appointmentId?: number | null;
  consultationId?: number | null;
  doctorId?: string | null;
  notes?: StructuredNotes;
  onSaveDraft?: (notes: StructuredNotes, outcomeType: ConsultationOutcomeType | null, patientDecision: PatientDecision | null) => Promise<{ success: true; version: string }>;
};

function renderDocumentation(initial: HarnessProps) {
  const props = { ...initial };
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DocumentationProvider
        appointmentId={props.appointmentId ?? null}
        consultationId={props.consultationId ?? null}
        doctorId={props.doctorId ?? 'doctor-1'}
        notes={props.notes}
        onSaveDraft={props.onSaveDraft}
      >
        {children}
      </DocumentationProvider>
    );
  }
  const hook = renderHook(() => useDocumentationContext(), { wrapper: Wrapper });
  return {
    ...hook,
    setProps(next: Partial<HarnessProps>) {
      Object.assign(props, next);
      hook.rerender();
    },
  };
}

describe('DocumentationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial empty state', () => {
    const { result } = renderDocumentation({ appointmentId: 1 });
    expect(result.current.notes).toEqual(EMPTY);
    expect(result.current.outcomeType).toBeNull();
    expect(result.current.patientDecision).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.autoSaveStatus).toBe('idle');
    expect(result.current.canSave).toBe(false);
  });

  it('shows appointment A notes and clears them when appointment B is empty', () => {
    const view = renderDocumentation({
      appointmentId: 1,
      consultationId: 10,
      notes: { chiefComplaint: 'Headache from A', examination: 'Exam A', assessment: 'Assessment A', plan: 'Plan A' },
    });

    expect(view.result.current.notes).toEqual({
      chiefComplaint: 'Headache from A',
      examination: 'Exam A',
      assessment: 'Assessment A',
      plan: 'Plan A',
    });

    act(() => {
      view.setProps({
        appointmentId: 2,
        consultationId: 20,
        notes: {},
      });
    });

    expect(view.result.current.notes).toEqual(EMPTY);
    expect(view.result.current.isDirty).toBe(false);
  });

  it('keeps in-progress edits when the same appointment supplies notes again', () => {
    const view = renderDocumentation({
      appointmentId: 1,
      notes: { chiefComplaint: 'Server', examination: '', assessment: '', plan: '' },
    });

    act(() => {
      view.result.current.updateNotes('chiefComplaint', 'Typed locally');
    });

    act(() => {
      view.setProps({
        notes: { chiefComplaint: 'A later server copy', examination: '', assessment: '', plan: '' },
      });
    });

    expect(view.result.current.notes.chiefComplaint).toBe('Typed locally');
    expect(view.result.current.isDirty).toBe(true);
  });

  it('updates a single note field and marks dirty', () => {
    const { result } = renderDocumentation({ appointmentId: 1 });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    expect(result.current.notes.chiefComplaint).toBe('Headache');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);
  });

  it('does not update if value is identical', () => {
    const { result } = renderDocumentation({ appointmentId: 1, notes: { chiefComplaint: 'Headache' } });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('sets outcome and auto-sets patient decision for PROCEDURE_RECOMMENDED', () => {
    const { result } = renderDocumentation({ appointmentId: 1 });
    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    });
    expect(result.current.outcomeType).toBe(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    expect(result.current.patientDecision).toBe(PatientDecision.YES);
    expect(result.current.isDirty).toBe(true);
  });

  it('clears patient decision for non-PROCEDURE_RECOMMENDED outcomes', () => {
    const { result } = renderDocumentation({ appointmentId: 1 });
    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    });
    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.REFERRAL_NEEDED);
    });
    expect(result.current.outcomeType).toBe(ConsultationOutcomeType.REFERRAL_NEEDED);
    expect(result.current.patientDecision).toBeNull();
  });

  it('saves the current notes and clears dirty state', async () => {
    const onSaveDraft = vi.fn().mockResolvedValue({ success: true, version: '1' });
    const { result } = renderDocumentation({ appointmentId: 1, onSaveDraft });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    await act(async () => {
      await result.current.saveDraft();
    });
    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ chiefComplaint: 'Headache' }),
      null,
      null,
    );
    expect(result.current.isDirty).toBe(false);
    expect(result.current.autoSaveStatus).toBe('saved');
    expect(result.current.lastSavedAt).toBe('1');
  });

  it('does not call save when the editor is clean', async () => {
    const onSaveDraft = vi.fn();
    const { result } = renderDocumentation({ appointmentId: 1, onSaveDraft });
    await act(async () => {
      await result.current.saveDraft();
    });
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(result.current.autoSaveStatus).toBe('idle');
  });

  it('rejects a failed save and leaves the draft dirty', async () => {
    const onSaveDraft = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderDocumentation({ appointmentId: 1, onSaveDraft });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    await act(async () => {
      await expect(result.current.saveDraft()).rejects.toThrow('Network error');
    });
    expect(result.current.autoSaveStatus).toBe('error');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.notes.chiefComplaint).toBe('Headache');
    expect(result.current.isSaving).toBe(false);
  });

  it('shares one in-flight save across repeated calls', async () => {
    let resolveSave: (value: { success: true; version: string }) => void = () => undefined;
    const onSaveDraft = vi.fn(() => new Promise<{ success: true; version: string }>((resolve) => {
      resolveSave = resolve;
    }));
    const { result } = renderDocumentation({ appointmentId: 1, onSaveDraft });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.saveDraft();
      second = result.current.saveDraft();
    });
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSave({ success: true, version: '1' });
      await first;
      await second;
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('saves edits made while a save is in flight before reporting success', async () => {
    const seen: string[] = [];
    let resolveFirst: (value: { success: true; version: string }) => void = () => undefined;
    const onSaveDraft = vi.fn((notes: StructuredNotes) => {
      seen.push(notes.chiefComplaint ?? '');
      if (seen.length === 1) {
        return new Promise<{ success: true; version: string }>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ success: true as const, version: '2' });
    });
    const { result } = renderDocumentation({ appointmentId: 1, onSaveDraft });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'First');
    });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.saveDraft();
    });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Second');
    });
    await act(async () => {
      resolveFirst({ success: true, version: '1' });
      await pending;
    });
    expect(seen).toEqual(['First', 'Second']);
    expect(result.current.notes.chiefComplaint).toBe('Second');
    expect(result.current.isDirty).toBe(false);
  });

  it('ignores a late save from appointment A after the editor opens empty appointment B', async () => {
    let resolveSave: (value: { success: true; version: string }) => void = () => undefined;
    const onSaveDraft = vi.fn(() => new Promise<{ success: true; version: string }>((resolve) => {
      resolveSave = resolve;
    }));
    const view = renderDocumentation({
      appointmentId: 1,
      consultationId: 10,
      notes: { chiefComplaint: 'From A', examination: 'Exam A', assessment: 'Assessment A', plan: 'Plan A' },
      onSaveDraft,
    });
    act(() => {
      view.result.current.updateNotes('chiefComplaint', 'Edited A');
    });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = view.result.current.saveDraft();
    });
    act(() => {
      view.setProps({
        appointmentId: 2,
        consultationId: 20,
        notes: {},
      });
    });
    act(() => {
      view.result.current.updateNotes('plan', 'Only B');
    });
    await act(async () => {
      resolveSave({ success: true, version: 'stale' });
      await expect(pending).rejects.toThrow('Consultation changed');
    });
    expect(view.result.current.notes).toEqual({
      chiefComplaint: '',
      examination: '',
      assessment: '',
      plan: 'Only B',
    });
    expect(view.result.current.isDirty).toBe(true);
    expect(view.result.current.autoSaveStatus).not.toBe('saved');

    const saveB = vi.fn().mockResolvedValue({ success: true, version: 'b' });
    act(() => {
      view.setProps({ onSaveDraft: saveB });
    });
    await act(async () => {
      await view.result.current.saveDraft();
    });
    expect(saveB).toHaveBeenCalledWith(
      expect.objectContaining({
        chiefComplaint: '',
        examination: '',
        assessment: '',
        plan: 'Only B',
      }),
      null,
      null,
    );
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    const firstPayload = onSaveDraft.mock.calls[0][0] as StructuredNotes;
    expect(firstPayload.chiefComplaint).toBe('Edited A');
    expect(firstPayload.plan).not.toBe('Only B');
  });
});
