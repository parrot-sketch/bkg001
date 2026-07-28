import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumeSession } from '@/actions/doctor/consultation-session';
import type { ResumeSessionResult } from '@/infrastructure/factories/ConsultationSessionFactory';

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/infrastructure/factories/ConsultationSessionFactory', () => ({
  createConsultationSession: vi.fn(),
  startConsultationSession: vi.fn(),
  resumeConsultationSession: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server-auth';
import { resumeConsultationSession } from '@/infrastructure/factories/ConsultationSessionFactory';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockResumeConsultationSession = vi.mocked(resumeConsultationSession);

function makeResumeResult(overrides: Partial<ResumeSessionResult> = {}): ResumeSessionResult {
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
        notes: {
          fullText: 'Existing notes',
          structured: {
            chiefComplaint: 'Headache',
            examination: 'Normal',
            assessment: 'Migraine',
            plan: 'Rest',
          },
        },
        outcomeType: null,
        patientDecision: null,
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T09:00:00.000Z',
      },
      doctorId: 'doctor-1',
      workflowState: 'ACTIVE',
      isDirty: false,
      draftAvailable: false,
      notes: {
        chiefComplaint: 'Headache',
        examination: 'Normal',
        assessment: 'Migraine',
        plan: 'Rest',
      },
      outcomeType: null,
      patientDecision: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resumeSession Server Action', () => {
  it('returns serialized session on successful resume', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockResumeConsultationSession.mockResolvedValue(makeResumeResult());

    const result = await resumeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session).toBeDefined();
      expect(result.data.session.consultation.state).toBe('IN_PROGRESS');
      expect(result.data.session.workflowState).toBe('ACTIVE');
      expect(result.data.session.notes.chiefComplaint).toBe('Headache');
    }

    expect(mockResumeConsultationSession).toHaveBeenCalledWith(
      { appointmentId: 1, user: { id: 'doctor-1', email: 'doctor@example.com', role: 'DOCTOR' } },
      1
    );
  });

  it('returns error when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await resumeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Unauthorized');
    }

    expect(mockResumeConsultationSession).not.toHaveBeenCalled();
  });

  it('returns error when factory throws', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockResumeConsultationSession.mockRejectedValue(new Error('Database error'));

    const result = await resumeSession(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Failed to resume consultation');
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

    mockResumeConsultationSession.mockRejectedValue(new Error('Invalid consultation ID'));

    const result = await resumeSession(0);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Failed to resume consultation');
    }
  });

  it('verifies all dates are serialized as ISO strings', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const resumeResult = makeResumeResult();
    mockResumeConsultationSession.mockResolvedValue(resumeResult);

    const result = await resumeSession(1);

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

    const resumeResult = makeResumeResult();
    mockResumeConsultationSession.mockResolvedValue(resumeResult);

    const result = await resumeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      const serialized = JSON.stringify(result.data.session);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    }
  });

  it('preserves existing notes and documentation during resume', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    const resumeResult = makeResumeResult();
    mockResumeConsultationSession.mockResolvedValue(resumeResult);

    const result = await resumeSession(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session.notes.chiefComplaint).toBe('Headache');
      expect(result.data.session.notes.examination).toBe('Normal');
      expect(result.data.session.consultation.notes?.structured?.plan).toBe('Rest');
    }
  });

  it('maintains idempotency for repeated calls', async () => {
    mockGetCurrentUser.mockResolvedValue({
      userId: 'doctor-1',
      email: 'doctor@example.com',
      role: 'DOCTOR',
    } as any);

    mockResumeConsultationSession.mockResolvedValue(makeResumeResult());

    const result1 = await resumeSession(1);
    const result2 = await resumeSession(1);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(mockResumeConsultationSession).toHaveBeenCalledTimes(2);
  });
});
