/**
 * DraftService
 *
 * Application Service responsible for the consultation draft lifecycle.
 *
 * Responsibilities:
 * - Persist draft notes to backend and local storage
 * - Restore drafts when local version is newer than server
 * - Discard drafts after consultation completion
 * - Serialize structured notes to full-text format
 * - Parse legacy full-text notes back to structured format
 *
 * Does NOT own:
 * - React state, reducers, timers, UI, notifications, navigation
 */

import { ConsultationApi } from '@/domain/interfaces/services/ConsultationApi';
import type { DraftStorage, DraftRecord, DraftResult, DraftDataResult } from '@/shared-kernel/interfaces/draft-storage';
import { draftData, draftEmpty, draftFailure } from '@/shared-kernel/interfaces/draft-storage';
import { ClinicalErrorCode, ClinicalErrorCategory, ClinicalErrorSeverity } from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { generateFullText, parseLegacyNotes } from '@/shared-kernel/utils/note-serialization';
import { isVersionConflict } from '@/shared-kernel/utils/version-conflict';

export type SaveDraftResult =
  | { readonly success: true; readonly version: string }
  | { readonly success: false; readonly error: ClinicalError };

const DRAFT_STORAGE_KEY_PREFIX = 'consultation-draft-';

function makeDraftKey(appointmentId: number | string): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${appointmentId}`;
}

function isDraftDataResult<T>(
  result: DraftResult<T>
): result is DraftDataResult<T> {
  return result.success === true && 'record' in result;
}

function makeSuccess(version: string): SaveDraftResult {
  return { success: true, version };
}

function makeFailure(code: ClinicalErrorCode, message: string, cause?: unknown): SaveDraftResult {
  return {
    success: false,
    error: {
      code,
      category: ClinicalErrorCategory.DOCUMENTATION,
      message,
      recoverable: true,
      retryable: code === ClinicalErrorCode.STORAGE_UNAVAILABLE,
      severity: ClinicalErrorSeverity.ERROR,
      cause,
    },
  };
}

export class DraftService {
  constructor(
    private readonly consultationApi: ConsultationApi,
    private readonly draftStorage: DraftStorage<StructuredNotes>,
  ) {}

  async saveDraft(
    appointmentId: number,
    doctorId: string,
    notes: StructuredNotes,
    outcomeType?: ConsultationOutcomeType,
    patientDecision?: PatientDecision,
  ): Promise<SaveDraftResult> {
    if (!doctorId) {
      return makeFailure(ClinicalErrorCode.MISSING_REQUIRED_FIELD, 'Doctor ID is required to save draft');
    }

    const dto: Omit<SaveConsultationDraftDto, 'appointmentId'> = {
      doctorId,
      notes: {
        rawText: generateFullText(notes),
        structured: notes,
      },
      outcomeType,
      patientDecision,
    };

    const response = await this.consultationApi.saveConsultationDraft(appointmentId, dto);

    if (!response.success) {
      if (isVersionConflict(response.error?.message)) {
        return makeFailure(ClinicalErrorCode.DRAFT_CONFLICT, response.error?.message || 'Draft conflict detected', response.error);
      }
      return makeFailure(ClinicalErrorCode.DRAFT_SAVE_FAILED, response.error?.message || 'Failed to save draft', response.error);
    }

    const backupResult = this.draftStorage.saveDraft(makeDraftKey(appointmentId), notes);
    if (!backupResult.success) {
      return makeFailure(ClinicalErrorCode.STORAGE_UNAVAILABLE, backupResult.error?.message || 'Failed to backup draft to local storage', backupResult.error);
    }

    const updatedAt = response.data.updatedAt;
    const version = typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString();
    return makeSuccess(version);
  }

  async restoreDraft(
    appointmentId: number,
    serverUpdatedAt: Date | null | undefined,
  ): Promise<DraftRecord<StructuredNotes> | null> {
    const loadResult = this.draftStorage.loadDraft(makeDraftKey(appointmentId));

    if (!loadResult.success) {
      if (loadResult.error) {
        console.error('Failed to load draft:', loadResult.error);
      }
      return null;
    }

    if (!isDraftDataResult(loadResult)) {
      return null;
    }

    const draft = loadResult.record;
    const serverTime = serverUpdatedAt ?? new Date(0);

    try {
      const draftTime = new Date(draft.timestamp);
      if (draftTime > serverTime) {
        return draft;
      }
      await this.discardDraft(appointmentId);
      return null;
    } catch (e) {
      console.error('Failed to restore draft:', e);
      await this.discardDraft(appointmentId);
      return null;
    }
  }

  async discardDraft(appointmentId: number): Promise<void> {
    const result = this.draftStorage.removeDraft(makeDraftKey(appointmentId));
    if (!result.success) {
      console.error('Failed to discard draft:', result.error);
    }
  }
}
