import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpConsultationApi } from '@/lib/api/consultation-adapter';
import type { ApiError } from '@/lib/api/client';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';

function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as any;
}

describe('HttpConsultationApi', () => {
  let api: HttpConsultationApi;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    api = new HttpConsultationApi(mockApiClient);
    vi.clearAllMocks();
  });

  describe('loadConsultation', () => {
    it('returns data when consultation exists', async () => {
      const mockData = { id: 1, appointmentId: 10, state: 'IN_PROGRESS' } as ConsultationResponseDto;
      mockApiClient.get.mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('returns null data when consultation does not exist', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: null });

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toBeNull();
      }
    });

    it('maps 401 to UNAUTHORIZED', async () => {
      const apiError: ApiError = { success: false, error: 'Unauthorized', status: 401 };
      mockApiClient.get.mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('maps 403 to PERMISSION_DENIED', async () => {
      const apiError: ApiError = { success: false, error: 'Forbidden', status: 403 };
      mockApiClient.get.mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('maps 404 to APPOINTMENT_NOT_FOUND', async () => {
      const apiError: ApiError = { success: false, error: 'Not found', status: 404 };
      mockApiClient.get.mockResolvedValue(apiError);

      const result = await api.loadConsultation(10);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
      }
    });

    it('maps network errors to NETWORK_UNAVAILABLE', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Failed to fetch'));

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
      mockApiClient.put.mockResolvedValue({ success: true, data: mockData });

      const result = await api.saveConsultationDraft(10, dto);
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/appointments/10/consultation/draft`,
        expect.objectContaining({ appointmentId: 10, notes: { rawText: 'test' } })
      );
    });
  });

  describe('loadPatientConsultationHistory', () => {
    it('returns consultation history', async () => {
      const mockData = { consultations: [] } as PatientConsultationHistoryDto;
      mockApiClient.get.mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadPatientConsultationHistory('patient-1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });
  });
});
