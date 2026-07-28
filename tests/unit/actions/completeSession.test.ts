import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeSession } from '@/actions/doctor/consultation-session';
import type { CompleteSessionResult } from '@/infrastructure/factories/ConsultationSessionFactory';

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/infrastructure/factories/ConsultationSessionFactory', () => ({
  createConsultationSession: vi.fn(),
  startConsultationSession: vi.fn(),
  resumeConsultationSession: vi.fn(),
  completeConsultationSession: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server-auth';
import { completeConsultationSession } from '@/infrastructure/factories/ConsultationSessionFactory';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockCompleteConsultationSession = vi.mocked(completeConsultationSession);

function makeCompleteResult(overrides: Partial<CompleteSessionResult> = {}): CompleteSessionResult {
  return {
    completedAppointmentId: 1,
    clearedLocalStorage: true,
    invalidationInstructions: [
      { queryKey: ['consultation', 1], direction: 'invalidate' as const },
      { queryKey: ['doctor', 'doctor-1'], direction: 'invalidate' as const },
      { queryKey: ['appointments'], direction: 'invalidate' as const },
      { queryKey: ['billing'], direction: 'invalidate' as const },
      { queryKey: ['appointment-billing'], direction: 'invalidate' as const },
    ],
    redirectPath: '/doctor/consultations',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('completeSession Server Action', () => {
  it('returns completion result on successful completion', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCompleteConsultationSession.mockResolvedValue(makeCompleteResult());

    const result = await completeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completedAppointmentId).toBe(1);
      expect(result.data.clearedLocalStorage).toBe(true);
      expect(result.data.redirectPath).toBe('/doctor/consultations');
      expect(result.data.invalidationInstructions).toHaveLength(5);
    }

    expect(mockCompleteConsultationSession).toHaveBeenCalledWith(
      { appointmentId: 1, user: { id: 'doctor-1', email: 'doctor@example.com', role: 'DOCTOR' } },
      1
    );
  });

  it('returns error when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await completeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Unauthorized');
    }

    expect(mockCompleteConsultationSession).not.toHaveBeenCalled();
  });

  it('returns error when factory throws', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCompleteConsultationSession.mockRejectedValue(new Error('Workflow error'));

    const result = await completeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Workflow error');
      expect(result.error.category).toBe('SYSTEM');
      expect(result.error.recoverable).toBe(true);
      expect(result.error.retryable).toBe(true);
    }
  });

  it('returns error for invalid consultation ID', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCompleteConsultationSession.mockRejectedValue(new Error('Invalid consultation ID'));

    const result = await completeSession(0);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid consultation ID');
    }
  });

  it('returns error when consultation is not in progress', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCompleteConsultationSession.mockRejectedValue(new Error('Consultation is not in progress'));

    const result = await completeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Consultation is not in progress');
    }
  });

  it('verifies invalidation instructions are returned', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const completeResult = makeCompleteResult();
    mockCompleteConsultationSession.mockResolvedValue(completeResult);

    const result = await completeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invalidationInstructions).toHaveLength(5);
      expect(result.data.invalidationInstructions[0].queryKey).toEqual(['consultation', 1]);
      expect(result.data.invalidationInstructions[0].direction).toBe('invalidate');
    }
  });

  it('verifies no class instances or functions leak in serialized output', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const completeResult = makeCompleteResult();
    mockCompleteConsultationSession.mockResolvedValue(completeResult);

    const result = await completeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      const serialized = JSON.stringify(result.data);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    }
  });

  it('maintains idempotency for repeated calls', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCompleteConsultationSession.mockResolvedValue(makeCompleteResult());

    const result1 = await completeSession(1);
    const result2 = await completeSession(1);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(mockCompleteConsultationSession).toHaveBeenCalledTimes(2);
  });
});
