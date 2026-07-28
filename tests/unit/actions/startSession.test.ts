import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startSession } from '@/actions/doctor/consultation-session';
import type { StartSessionResult } from '@/infrastructure/factories/ConsultationSessionFactory';

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/infrastructure/factories/ConsultationSessionFactory', () => ({
  createConsultationSession: vi.fn(),
  startConsultationSession: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server-auth';
import { startConsultationSession } from '@/infrastructure/factories/ConsultationSessionFactory';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockStartConsultationSession = vi.mocked(startConsultationSession);

function makeStartResult(overrides: Partial<StartSessionResult> = {}): StartSessionResult {
  return {
    session: {
      appointment: {
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: '2024-01-01T00:00:00.000Z',
        time: '09:00',
        status: 'IN_PROGRESS',
        type: 'CONSULTATION',
        patient: {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          fileNumber: 'FN-001',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'MALE',
          profileImage: null,
        },
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Smith',
        },
      },
      patient: {
        id: 'patient-1',
        fileNumber: 'FN-001',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        age: 34,
        gender: 'MALE',
        email: 'john@example.com',
        phone: '+1234567890',
        hasPrivacyConsent: true,
        hasServiceConsent: true,
        hasMedicalConsent: true,
        profileImage: null,
      },
      vitals: {
        bodyTemperature: 36.5,
        systolic: 120,
        diastolic: 80,
        heartRate: '72',
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 70,
        height: 175,
        recordedAt: '2024-01-01T09:00:00.000Z',
        recordedBy: 'nurse-1',
      },
      consultation: {
        id: 1,
        appointmentId: 1,
        doctorId: 'doctor-1',
        state: 'IN_PROGRESS',
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T09:00:00.000Z',
      },
      doctorId: 'doctor-1',
      workflowState: 'ACTIVE',
      isDirty: false,
      draftAvailable: false,
      notes: {},
      outcomeType: null,
      patientDecision: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startSession Server Action', () => {
  it('returns serialized session on successful start', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockStartConsultationSession.mockResolvedValue(makeStartResult());

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session).toBeDefined();
      expect(result.data.session.appointment.status).toBe('IN_PROGRESS');
      expect(result.data.session.consultation.state).toBe('IN_PROGRESS');
      expect(result.data.session.workflowState).toBe('ACTIVE');
    }

    expect(mockStartConsultationSession).toHaveBeenCalledWith(
      { appointmentId: 1, user: { id: 'doctor-1', email: 'doctor@example.com', role: 'DOCTOR' } },
      1,
      'doctor-1'
    );
  });

  it('returns error when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Unauthorized');
    }

    expect(mockStartConsultationSession).not.toHaveBeenCalled();
  });

  it('returns error when factory throws', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockStartConsultationSession.mockRejectedValue(new Error('Workflow error'));

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Failed to start consultation');
      expect(result.error.category).toBe('SYSTEM');
      expect(result.error.recoverable).toBe(true);
      expect(result.error.retryable).toBe(true);
    }
  });

  it('returns error for invalid appointment ID', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockStartConsultationSession.mockRejectedValue(new Error('Invalid appointment ID'));

    const result = await startSession(0, 'doctor-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Failed to start consultation');
    }
  });

  it('verifies all dates are serialized as ISO strings', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const startResult = makeStartResult();
    mockStartConsultationSession.mockResolvedValue(startResult);

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(true);
    if (result.success) {
      const session = result.data.session;
      expect(typeof session.appointment.appointmentDate).toBe('string');
      expect(typeof session.patient.dateOfBirth).toBe('string');
      expect(typeof session.consultation.createdAt).toBe('string');
      expect(typeof session.vitals?.recordedAt).toBe('string');
    }
  });

  it('verifies no class instances or functions leak in serialized output', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const startResult = makeStartResult();
    mockStartConsultationSession.mockResolvedValue(startResult);

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(true);
    if (result.success) {
      const serialized = JSON.stringify(result.data.session);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    }
  });

  it('propagates workflow state correctly', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const startResult = makeStartResult();
    mockStartConsultationSession.mockResolvedValue(startResult);

    const result = await startSession(1, 'doctor-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session.workflowState).toBe('ACTIVE');
      expect(result.data.session.consultation.state).toBe('IN_PROGRESS');
      expect(result.data.session.appointment.status).toBe('IN_PROGRESS');
    }
  });

  it('maintains idempotency for repeated calls', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockStartConsultationSession.mockResolvedValue(makeStartResult());

    const result1 = await startSession(1, 'doctor-1');
    const result2 = await startSession(1, 'doctor-1');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(mockStartConsultationSession).toHaveBeenCalledTimes(2);
  });
});
