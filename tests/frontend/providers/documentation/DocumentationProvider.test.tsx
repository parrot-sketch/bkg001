import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { DraftService } from '@/application/services/DraftService';
import { DocumentationProvider, useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

function makeDraftService(overrides: Partial<DraftService> = {}): DraftService {
  return {
    saveDraft: vi.fn().mockResolvedValue({ success: true, version: '1' }),
    restoreDraft: vi.fn().mockResolvedValue(null),
    discardDraft: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as DraftService;
}

function wrapper(draftService: DraftService, props: { consultationId?: number | null; doctorId?: string | null; isCompleted?: boolean } = {}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DocumentationProvider
        draftService={draftService}
        consultationId={props.consultationId ?? 1}
        doctorId={props.doctorId ?? 'doctor-1'}
        isCompleted={props.isCompleted ?? false}
      >
        {children}
      </DocumentationProvider>
    );
  };
}

describe('DocumentationProvider', () => {
  let draftService: DraftService;

  beforeEach(() => {
    vi.useFakeTimers();
    draftService = makeDraftService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns initial empty state', () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    expect(result.current.notes).toEqual({});
    expect(result.current.outcomeType).toBeNull();
    expect(result.current.patientDecision).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.autoSaveStatus).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.hasConflict).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('updates a single note field and marks dirty', () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    expect(result.current.notes.chiefComplaint).toBe('Headache');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);
  });

  it('does not update if value is identical', () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });
    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    expect(result.current.notes.chiefComplaint).toBe('Headache');
  });

  it('sets outcome and auto-sets patient decision for PROCEDURE_RECOMMENDED', () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    });

    expect(result.current.outcomeType).toBe(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    expect(result.current.patientDecision).toBe(PatientDecision.YES);
    expect(result.current.isDirty).toBe(true);
  });

  it('clears patient decision for non-PROCEDURE_RECOMMENDED outcomes', () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
    });
    act(() => {
      result.current.setOutcome(ConsultationOutcomeType.REFERRAL);
    });

    expect(result.current.outcomeType).toBe(ConsultationOutcomeType.REFERRAL);
    expect(result.current.patientDecision).toBeNull();
  });

  it('triggers saveDraft after debounce when dirty', async () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(draftService.saveDraft).toHaveBeenCalledWith(
      1,
      'doctor-1',
      expect.any(Object),
      undefined,
      undefined
    );
    expect(result.current.autoSaveStatus).toBe('saved');
  });

  it('returns early when not dirty', async () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(draftService.saveDraft).not.toHaveBeenCalled();
  });

  it('delegates to DraftService when dirty', async () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(draftService.saveDraft).toHaveBeenCalledWith(
      1,
      'doctor-1',
      expect.objectContaining({ chiefComplaint: 'Headache' }),
      undefined,
      undefined
    );
    expect(result.current.isDirty).toBe(false);
    expect(result.current.autoSaveStatus).toBe('saved');
    expect(result.current.lastSavedAt).toBe('1');
  });

  it('handles DraftService failure', async () => {
    draftService = makeDraftService({
      saveDraft: vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_UNAVAILABLE', message: 'Storage full', category: 'INFRASTRUCTURE', recoverable: true, retryable: false },
      }),
    });

    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(result.current.autoSaveStatus).toBe('error');
    expect(result.current.isDirty).toBe(true);
  });

  it('handles unexpected errors during save', async () => {
    draftService = makeDraftService({
      saveDraft: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(result.current.autoSaveStatus).toBe('error');
    expect(result.current.isSaving).toBe(false);
  });

  it('saves via DraftService for active consultation via saveNotes', async () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService, { isCompleted: false }),
    });

    act(() => {
      result.current.updateNotes('chiefComplaint', 'Headache');
    });

    await act(async () => {
      await result.current.saveNotes();
    });

    expect(draftService.saveDraft).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it('returns early from saveNotes when not dirty', async () => {
    const { result } = renderHook(() => useDocumentationContext(), {
      wrapper: wrapper(draftService),
    });

    await act(async () => {
      await result.current.saveNotes();
    });

    expect(draftService.saveDraft).not.toHaveBeenCalled();
  });
});
