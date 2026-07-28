import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpQueueApi } from '@/lib/api/queue-adapter';
import { apiClient } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/client';
import type { QueuePatient } from '@/domain/interfaces/services/QueueApi';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('HttpQueueApi', () => {
  let api: HttpQueueApi;

  beforeEach(() => {
    api = new HttpQueueApi();
    vi.clearAllMocks();
  });

  describe('loadQueue', () => {
    it('returns queue data when available', async () => {
      const mockData = [
        {
          id: 1,
          patientId: 'p1',
          patient: { id: 'p1', firstName: 'John', lastName: 'Doe', fileNumber: 'FN001' },
          appointmentId: 10,
          appointmentDate: '2024-01-01',
          time: '10:00',
          type: 'CONSULTATION',
          status: 'WAITING',
          addedAt: '2024-01-01T09:00:00Z',
          waitTime: '1h',
          notes: null,
          isWalkIn: false,
        },
      ] as QueuePatient[];
      vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: mockData });

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('returns empty array when queue is empty', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] });

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data).toEqual([]);
      }
    });

    it('maps 401 to UNAUTHORIZED', async () => {
      const apiError: ApiError = { success: false, error: 'Unauthorized', status: 401 };
      vi.mocked(apiClient.get).mockResolvedValue(apiError);

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('maps 403 to PERMISSION_DENIED', async () => {
      const apiError: ApiError = { success: false, error: 'Forbidden', status: 403 };
      vi.mocked(apiClient.get).mockResolvedValue(apiError);

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('maps 404 to QUEUE_ITEM_MISSING', async () => {
      const apiError: ApiError = { success: false, error: 'Not found', status: 404 };
      vi.mocked(apiClient.get).mockResolvedValue(apiError);

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('QUEUE_ITEM_MISSING');
        expect(result.error.category).toBe('QUEUE');
      }
    });

    it('maps network errors to NETWORK_UNAVAILABLE', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Failed to fetch'));

      const result = await api.loadQueue('doctor-1');
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('NETWORK_UNAVAILABLE');
        expect(result.error.category).toBe('INFRASTRUCTURE');
      }
    });
  });
});
