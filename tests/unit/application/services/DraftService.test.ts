/**
 * DraftService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftService, type SaveDraftResult } from '@/application/services/DraftService';
import type { ConsultationApi } from '@/domain/interfaces/services/ConsultationApi';
import type { DraftStorage, DraftRecord, DraftResult } from '@/shared-kernel/interfaces/draft-storage';
import { draftData, draftEmpty, draftFailure } from '@/shared-kernel/interfaces/draft-storage';
import { ClinicalErrorCode, ClinicalErrorCategory, ClinicalErrorSeverity } from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { generateFullText, parseLegacyNotes } from '@/shared-kernel/utils/note-serialization';
import { isVersionConflict } from '@/shared-kernel/utils/version-conflict';

function makeConsultationApi(overrides: Partial<ConsultationApi> = {}): ConsultationApi {
  return {
    loadConsultation: vi.fn(),
    saveConsultationDraft: vi.fn(),
    loadPatientConsultationHistory: vi.fn(),
    ...overrides,
  } as unknown as ConsultationApi;
}

function makeDraftStorage(overrides: Partial<DraftStorage<StructuredNotes>> = {}): DraftStorage<StructuredNotes> {
  return {
    capabilities: { supportsTTL: false, supportsList: true },
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    removeDraft: vi.fn(),
    exists: vi.fn(),
    listKeys: vi.fn(),
    clearExpired: vi.fn(),
    ...overrides,
  } as unknown as DraftStorage<StructuredNotes>;
}

const sampleNotes: StructuredNotes = {
  chiefComplaint: 'Test complaint',
  examination: 'Test exam',
  assessment: 'Test assessment',
  plan: 'Test plan',
};

const sampleServerResponse: ConsultationResponseDto = {
  id: 1,
  appointmentId: 1,
  doctorId: 'doctor-1',
  state: 'IN_PROGRESS',
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: {
    fullText: 'Full text notes',
    structured: sampleNotes,
  },
};

describe('DraftService', () => {
  let consultationApi: ConsultationApi;
  let draftStorage: DraftStorage<StructuredNotes>;
  let service: DraftService;

  beforeEach(() => {
    consultationApi = makeConsultationApi();
    draftStorage = makeDraftStorage();
    service = new DraftService(consultationApi, draftStorage);
  });

  describe('saveDraft', () => {
    it('returns failure when doctorId is missing', async () => {
      const result = await service.saveDraft(1, '', sampleNotes);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ClinicalErrorCode.MISSING_REQUIRED_FIELD);
      }
    });

    it('returns success with version on successful save', async () => {
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      vi.mocked(consultationApi.saveConsultationDraft).mockResolvedValue({
        success: true,
        data: { ...sampleServerResponse, updatedAt },
      });
      vi.mocked(draftStorage.saveDraft).mockReturnValue(draftEmpty());

      const result = await service.saveDraft(1, 'doctor-1', sampleNotes);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.version).toBe(updatedAt.toISOString());
      }
    });

    it('calls ConsultationApi.saveConsultationDraft with correct payload', async () => {
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      vi.mocked(consultationApi.saveConsultationDraft).mockResolvedValue({
        success: true,
        data: { ...sampleServerResponse, updatedAt },
      });
      vi.mocked(draftStorage.saveDraft).mockReturnValue(draftEmpty());

      await service.saveDraft(1, 'doctor-1', sampleNotes, 'PROCEDURE_RECOMMENDED' as ConsultationOutcomeType, 'YES' as PatientDecision);

      expect(consultationApi.saveConsultationDraft).toHaveBeenCalledWith(1, {
        doctorId: 'doctor-1',
        notes: {
          rawText: generateFullText(sampleNotes),
          structured: sampleNotes,
        },
        outcomeType: 'PROCEDURE_RECOMMENDED' as ConsultationOutcomeType,
        patientDecision: 'YES' as PatientDecision,
      });
    });

    it('returns failure when ConsultationApi returns error', async () => {
      vi.mocked(consultationApi.saveConsultationDraft).mockResolvedValue({
        success: false,
        error: {
          code: ClinicalErrorCode.SERVER_ERROR,
          category: ClinicalErrorCategory.CONSULTATION,
          message: 'Network error',
          recoverable: true,
          retryable: true,
          severity: ClinicalErrorSeverity.ERROR,
        },
      });

      const result = await service.saveDraft(1, 'doctor-1', sampleNotes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ClinicalErrorCode.DRAFT_SAVE_FAILED);
        expect(result.error.message).toBe('Network error');
      }
    });

    it('detects version conflict from error message', async () => {
      vi.mocked(consultationApi.saveConsultationDraft).mockResolvedValue({
        success: false,
        error: {
          code: ClinicalErrorCode.SERVER_ERROR,
          category: ClinicalErrorCategory.CONSULTATION,
          message: 'Consultation was updated by another session',
          recoverable: true,
          retryable: false,
          severity: ClinicalErrorSeverity.ERROR,
        },
      });

      const result = await service.saveDraft(1, 'doctor-1', sampleNotes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ClinicalErrorCode.DRAFT_CONFLICT);
      }
    });

    it('returns failure when localStorage backup fails', async () => {
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      vi.mocked(consultationApi.saveConsultationDraft).mockResolvedValue({
        success: true,
        data: { ...sampleServerResponse, updatedAt },
      });
      vi.mocked(draftStorage.saveDraft).mockReturnValue(
        draftFailure(ClinicalErrorCode.STORAGE_UNAVAILABLE, 'Storage quota exceeded')
      );

      const result = await service.saveDraft(1, 'doctor-1', sampleNotes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ClinicalErrorCode.STORAGE_UNAVAILABLE);
      }
    });
  });

  describe('restoreDraft', () => {
    it('returns draft when it is newer than server', async () => {
      const draft: DraftRecord<StructuredNotes> = {
        structured: sampleNotes,
        timestamp: '2024-12-31T23:59:59.000Z',
      };
      vi.mocked(draftStorage.loadDraft).mockReturnValue(draftData(draft));

      const result = await service.restoreDraft(1, new Date('2024-01-01T00:00:00.000Z'));

      expect(result).toEqual(draft);
    });

    it('returns null and discards draft when it is older than server', async () => {
      const draft: DraftRecord<StructuredNotes> = {
        structured: sampleNotes,
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      vi.mocked(draftStorage.loadDraft).mockReturnValue(draftData(draft));
      vi.mocked(draftStorage.removeDraft).mockReturnValue(draftEmpty());

      const result = await service.restoreDraft(1, new Date('2024-12-31T23:59:59.000Z'));

      expect(result).toBeNull();
      expect(draftStorage.removeDraft).toHaveBeenCalledWith('consultation-draft-1');
    });

    it('returns null when no draft exists', async () => {
      vi.mocked(draftStorage.loadDraft).mockReturnValue(draftEmpty());

      const result = await service.restoreDraft(1, new Date('2024-01-01T00:00:00.000Z'));

      expect(result).toBeNull();
    });

    it('returns null when draft is corrupt', async () => {
      vi.mocked(draftStorage.loadDraft).mockReturnValue(
        draftFailure(ClinicalErrorCode.DRAFT_CORRUPTED, 'Corrupt draft')
      );

      const result = await service.restoreDraft(1, new Date('2024-01-01T00:00:00.000Z'));

      expect(result).toBeNull();
    });

    it('handles missing server timestamp by treating server as oldest', async () => {
      const draft: DraftRecord<StructuredNotes> = {
        structured: sampleNotes,
        timestamp: '2024-06-01T00:00:00.000Z',
      };
      vi.mocked(draftStorage.loadDraft).mockReturnValue(draftData(draft));
      vi.mocked(draftStorage.removeDraft).mockReturnValue(draftEmpty());

      const result = await service.restoreDraft(1, null);

      expect(result).toEqual(draft);
    });
  });

  describe('discardDraft', () => {
    it('removes draft from storage', async () => {
      vi.mocked(draftStorage.removeDraft).mockReturnValue(draftEmpty());

      await service.discardDraft(1);

      expect(draftStorage.removeDraft).toHaveBeenCalledWith('consultation-draft-1');
    });
  });
});

describe('DraftService helpers', () => {
  describe('generateFullText', () => {
    it('generates empty string for empty notes', () => {
      expect(generateFullText({})).toBe('');
    });

    it('formats full text from structured notes', () => {
      const notes: StructuredNotes = {
        chiefComplaint: 'Test complaint',
        examination: 'Test exam',
        plan: 'Test plan',
      };

      const result = generateFullText(notes);

      expect(result).toContain('PATIENT CONCERNS:\nTest complaint');
      expect(result).toContain('TREATMENT PLAN & CLINICAL NOTES:\nTest exam\n\nTest plan');
    });

    it('separates sections with delimiter', () => {
      const notes: StructuredNotes = {
        chiefComplaint: 'Complaint',
        plan: 'Plan',
      };

      const result = generateFullText(notes);

      expect(result).toContain('='.repeat(40));
    });
  });

  describe('parseLegacyNotes', () => {
    it('parses legacy notes format', () => {
      const fullText = `Chief Complaint: Test complaint

Examination: Test exam

Assessment: Test assessment

Plan: Test plan`;

      const result = parseLegacyNotes(fullText);

      expect(result.chiefComplaint).toBe('Test complaint');
      expect(result.examination).toBe('Test exam');
      expect(result.assessment).toBe('Test assessment');
      expect(result.plan).toBe('Test plan');
    });

    it('ignores missing sections', () => {
      const fullText = `Chief Complaint: Only complaint`;

      const result = parseLegacyNotes(fullText);

      expect(result.chiefComplaint).toBe('Only complaint');
      expect(result.examination).toBeUndefined();
      expect(result.assessment).toBeUndefined();
      expect(result.plan).toBeUndefined();
    });

    it('handles empty string', () => {
      const result = parseLegacyNotes('');
      expect(result).toEqual({});
    });
  });
});
