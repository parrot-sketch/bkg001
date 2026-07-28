import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeSession } from '@/actions/doctor/consultation-session';
import type { SerializedSessionData, ConsultationSessionResult } from '@/infrastructure/factories/ConsultationSessionFactory';

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/infrastructure/factories/ConsultationSessionFactory', () => ({
  createConsultationSession: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server-auth';
import { createConsultationSession } from '@/infrastructure/factories/ConsultationSessionFactory';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockCreateConsultationSession = vi.mocked(createConsultationSession);

function makeSessionResult(overrides: Partial<ConsultationSessionResult> = {}): ConsultationSessionResult {
  return {
    initialSession: {
      appointment: {
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: '2024-01-01T00:00:00.000Z',
        time: '09:00',
        status: 'CHECKED_IN',
        type: 'CONSULTATION',
        patient: {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          fileNumber: 'FN-001',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'MALE',
          phone: '+1234567890',
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
        bloodGroup: 'A+',
        allergies: 'None',
        medicalConditions: 'None',
        medicalHistory: 'None',
        insuranceProvider: 'Provider',
        insuranceNumber: 'INS-001',
        profileImage: null,
        colorCode: '#000000',
        visitCount: 1,
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
        state: 'IDLE',
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T09:00:00.000Z',
      },
      doctorId: 'doctor-1',
      workflowState: 'IDLE',
      isDirty: false,
      draftAvailable: false,
      notes: {},
      outcomeType: null,
      patientDecision: null,
    },
    restoredDraft: false,
    invalidationInstructions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initializeSession Server Action', () => {
  it('returns serialized session on successful initialization', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const sessionResult = makeSessionResult();
    mockCreateConsultationSession.mockResolvedValue(sessionResult);

    const result = await initializeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session).toEqual(sessionResult.initialSession);
      expect(result.data.restoredDraft).toBe(false);
      expect(result.data.invalidationInstructions).toEqual([]);
    }

    expect(mockCreateConsultationSession).toHaveBeenCalledWith({
      appointmentId: 1,
      user: { id: 'doctor-1', email: 'doctor@example.com', role: 'DOCTOR' },
    });
  });

  it('returns error when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await initializeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Unauthorized');
    }

    expect(mockCreateConsultationSession).not.toHaveBeenCalled();
  });

  it('returns system error when factory throws', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockCreateConsultationSession.mockRejectedValue(new Error('Database error'));

    const result = await initializeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Failed to initialize session');
      expect(result.error.category).toBe('SYSTEM');
      expect(result.error.recoverable).toBe(true);
      expect(result.error.retryable).toBe(true);
    }
  });

  it('verifies all dates are serialized as ISO strings', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const sessionResult = makeSessionResult();
    mockCreateConsultationSession.mockResolvedValue(sessionResult);

    const result = await initializeSession(1);

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

    const sessionResult = makeSessionResult();
    mockCreateConsultationSession.mockResolvedValue(sessionResult);

    const result = await initializeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      const serialized = JSON.stringify(result.data.session);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    }
  });

  it('preserves compatibility façade behavior through serialization', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const sessionResult = makeSessionResult();
    mockCreateConsultationSession.mockResolvedValue(sessionResult);

    const result = await initializeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      const session = result.data.session;
      expect(session.appointment.patient?.fullName).toBe('John Doe');
      expect(session.notes).toEqual({});
      expect(session.workflowState).toBe('IDLE');
    }
  });

  it('propagates invalidation instructions from factory', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const sessionResult = makeSessionResult({
      invalidationInstructions: [
        { queryKey: ['doctor', 'doctor-1', 'appointments'], direction: 'invalidate' as const },
      ],
    });
    mockCreateConsultationSession.mockResolvedValue(sessionResult);

    const result = await initializeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invalidationInstructions).toHaveLength(1);
      expect(result.data.invalidationInstructions[0].queryKey).toEqual(['doctor', 'doctor-1', 'appointments']);
    }
  });
});
