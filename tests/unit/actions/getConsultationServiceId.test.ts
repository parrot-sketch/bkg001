import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsultationServiceId } from '@/actions/doctor/consultation-session';

vi.mock('@/application/services/billing/resolveConsultationServiceId', () => ({
  resolveConsultationServiceId: vi.fn(),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    userId: 'doctor-1',
    email: 'doctor@example.com',
    role: 'DOCTOR',
  }),
}));

import { resolveConsultationServiceId } from '@/application/services/billing/resolveConsultationServiceId';

const mockResolveConsultationServiceId = vi.mocked(resolveConsultationServiceId);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getConsultationServiceId Server Action', () => {
  it('returns serviceId on successful resolution', async () => {
    mockResolveConsultationServiceId.mockResolvedValue(42);

    const result = await getConsultationServiceId();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serviceId).toBe(42);
    }
    expect(mockResolveConsultationServiceId).toHaveBeenCalledTimes(1);
  });

  it('returns error when service resolution fails', async () => {
    mockResolveConsultationServiceId.mockRejectedValue(new Error('DB error'));

    const result = await getConsultationServiceId();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toContain('Failed to resolve consultation service');
    }
  });
});
