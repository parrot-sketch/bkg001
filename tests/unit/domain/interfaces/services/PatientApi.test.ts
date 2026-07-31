import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpPatientApi } from '@/lib/api/patient-adapter';
import type { ApiClient } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/client';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as ApiClient;
}

describe('HttpPatientApi', () => {
  let api: HttpPatientApi;
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    api = new HttpPatientApi(mockApiClient);
    vi.clearAllMocks();
  });

  describe('loadPatient', () => {
    it('returns patient data when found', async () => {
      const mockData = { id: 'p1', firstName: 'John', lastName: 'Doe' } as PatientResponseDto;
      vi.mocked(mockApiClient.get).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadPatient('p1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('maps 401 to UNAUTHORIZED', async () => {
      const apiError: ApiError = { success: false, error: 'Unauthorized', status: 401 };
      vi.mocked(mockApiClient.get).mockResolvedValue(apiError);

      const result = await api.loadPatient('p1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('maps 404 to PATIENT_NOT_FOUND', async () => {
      const apiError: ApiError = { success: false, error: 'Not found', status: 404 };
      vi.mocked(mockApiClient.get).mockResolvedValue(apiError);

      const result = await api.loadPatient('p1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('PATIENT_NOT_FOUND');
      }
    });

    it('maps network errors to NETWORK_UNAVAILABLE', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Failed to fetch'));

      const result = await api.loadPatient('p1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('NETWORK_UNAVAILABLE');
        expect(result.error.category).toBe('INFRASTRUCTURE');
      }
    });
  });

  describe('loadPatientAppointments', () => {
    it('returns appointments array', async () => {
      const mockData = [{ id: 1, appointmentDate: '2024-01-01' }] as AppointmentResponseDto[];
      vi.mocked(mockApiClient.get).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadPatientAppointments('p1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });
  });

  describe('loadUpcomingAppointments', () => {
    it('returns upcoming appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];
      const mockData = [{ id: 1, appointmentDate: futureDate, status: 'SCHEDULED' }] as AppointmentResponseDto[];
      vi.mocked(mockApiClient.get).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadUpcomingAppointments('p1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });
  });
});
