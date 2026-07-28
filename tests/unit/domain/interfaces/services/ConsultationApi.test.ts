import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpConsultationApi } from '@/lib/api/consultation-adapter';
import { consultationApi } from '@/lib/api/consultation';
import type { ApiError } from '@/lib/api/client';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';

vi.mock('@/lib/api/consultation', () => ({
  consultationApi: {
    getConsultation: vi.fn(),
    saveDraft: vi.fn(),
    getPatientConsultationHistory: vi.fn(),
  },
}));

describe('HttpConsultationApi', () => {
  let api: HttpConsultationApi;

  beforeEach(() => {
    api = new HttpConsultationApi();
    vi.clearAllMocks();
  });

  describe('loadConsultation', () => {
    it('returns data when consultation exists', async () => {
      const mockData = { id: 1, appointmentId: 10, state: 'IN_PROGRESS' } as ConsultationResponseDto;
      vi.mocked(consultationApi.getConsultation).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('returns null data when consultation does not exist', async () => {
      vi.mocked(consultationApi.getConsultation).mockResolvedValue({ success: true, data: null });

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toBeNull();
      }
    });

    it('maps 401 to UNAUTHORIZED', async () => {
      const apiError: ApiError = { success: false, error: 'Unauthorized', status: 401 };
      vi.mocked(consultationApi.getConsultation).mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('maps 403 to PERMISSION_DENIED', async () => {
      const apiError: ApiError = { success: false, error: 'Forbidden', status: 403 };
      vi.mocked(consultationApi.getConsultation).mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('maps 404 to APPOINTMENT_NOT_FOUND', async () => {
      const apiError: ApiError = { success: false, error: 'Not found', status: 404 };
      vi.mocked(consultationApi.getConsultation).mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
      }
    });

    it('maps network errors to NETWORK_UNAVAILABLE', async () => {
      vi.mocked(consultationApi.getConsultation).mockRejectedValue(new Error('Failed to fetch'));

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('NETWORK_UNAVAILABLE');
        expect(result.error.category).toBe('INFRASTRUCTURE');
      }
    });
  });

  describe('saveConsultationDraft', () => {
    it('returns saved consultation data', async () => {
      const mockData = { id: 1, appointmentId: 10, state: 'IN_PROGRESS' } as ConsultationResponseDto;
      const dto = { notes: { rawText: 'test' } } as SaveConsultationDraftDto;
      vi.mocked(consultationApi.saveDraft).mockResolvedValue({ success: true, data: mockData });

      const result = await api.saveConsultationDraft(10, dto);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
      expect(consultationApi.saveDraft).toHaveBeenCalledWith(10, dto);
    });
  });

  describe('loadPatientConsultationHistory', () => {
    it('returns consultation history', async () => {
      const mockData = { consultations: [] } as PatientConsultationHistoryDto;
      vi.mocked(consultationApi.getPatientConsultationHistory).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadPatientConsultationHistory('patient-1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });
  });
});
