import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionOperationsShim } from '@/application/shims/SessionOperationsShim';
import type { SessionResult, SessionData, SessionInitializationResult } from '@/application/services/SessionService';
import type { SessionService } from '@/application/services/SessionService';
import type { LegacySessionOperations } from '@/application/shims/LegacySessionOperations';

const sampleAppointment = {
  id: 1,
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  appointmentDate: new Date(),
  time: '10:00',
  status: 'CHECKED_IN',
  type: 'CONSULTATION',
};

const samplePatient = {
  id: 'patient-1',
  fileNumber: 'P001',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  dateOfBirth: new Date('1990-01-01'),
  age: 34,
  gender: 'male',
  email: 'john@example.com',
  phone: '1234567890',
  hasPrivacyConsent: true,
  hasServiceConsent: true,
  hasMedicalConsent: true,
};

describe('SessionOperationsShim', () => {
  let service: SessionService;
  let legacy: LegacySessionOperations;
  let shim: SessionOperationsShim;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('service path (flag enabled)', () => {
    it('delegates initializeSession to service when flag is enabled', async () => {
      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'true';

      service = {
        initializeSession: vi.fn().mockResolvedValue({
          success: true,
          data: {
            session: { appointment: sampleAppointment, patient: samplePatient, vitals: [], consultation: null, doctorId: 'doctor-1', workflowState: 0, isDirty: false, draftAvailable: false },
            restoredDraft: false,
            invalidationInstructions: [],
          },
        }),
        startSession: vi.fn(),
        resumeSession: vi.fn(),
        completeSession: vi.fn(),
        cancelCompletion: vi.fn(),
        pauseSession: vi.fn(),
        resumePausedSession: vi.fn(),
        switchSession: vi.fn(),
        advanceQueue: vi.fn(),
        sendHeartbeat: vi.fn(),
      } as unknown as SessionService;

      legacy = {
        initializeSession: vi.fn(),
        startConsultation: vi.fn(),
        completeConsultation: vi.fn(),
        switchToPatient: vi.fn(),
        sendHeartbeat: vi.fn(),
        persistDraftBackup: vi.fn(),
      } as unknown as LegacySessionOperations;

      shim = new SessionOperationsShim(service, legacy, { id: 'user-1' }, vi.fn());

      const result = await shim.initializeSession(1);
      expect(result.success).toBe(true);
      expect(service.initializeSession).toHaveBeenCalledWith(1, 'user-1');
      expect(legacy.initializeSession).not.toHaveBeenCalled();
    });
  });

  describe('legacy path (flag disabled)', () => {
    it('delegates initializeSession to legacy when flag is disabled', async () => {
      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'false';

      service = {
        initializeSession: vi.fn(),
        startSession: vi.fn(),
        resumeSession: vi.fn(),
        completeSession: vi.fn(),
        cancelCompletion: vi.fn(),
        pauseSession: vi.fn(),
        resumePausedSession: vi.fn(),
        switchSession: vi.fn(),
        advanceQueue: vi.fn(),
        sendHeartbeat: vi.fn(),
      } as unknown as SessionService;

      legacy = {
        initializeSession: vi.fn().mockResolvedValue({
          success: true,
          data: { appointment: sampleAppointment, patient: samplePatient, vitals: [], consultation: null, doctorId: 'doctor-1', workflowState: 0, isDirty: false },
        }),
        startConsultation: vi.fn(),
        completeConsultation: vi.fn(),
        switchToPatient: vi.fn(),
        sendHeartbeat: vi.fn(),
        persistDraftBackup: vi.fn(),
      } as unknown as LegacySessionOperations;

      shim = new SessionOperationsShim(service, legacy, { id: 'user-1' }, vi.fn());

      const result = await shim.initializeSession(1);
      expect(result.success).toBe(true);
      expect(legacy.initializeSession).toHaveBeenCalledWith(1, { id: 'user-1' }, expect.any(Function));
      expect(service.initializeSession).not.toHaveBeenCalled();
    });
  });

  describe('behaviour parity (service vs legacy)', () => {
    it('returns equivalent initialization data from both paths', async () => {
      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'true';

      const serviceInitialize = vi.fn().mockResolvedValue({
        success: true,
        data: {
          session: {
            appointment: sampleAppointment,
            patient: samplePatient,
            vitals: [],
            consultation: null,
            doctorId: 'doctor-1',
            workflowState: 0,
            isDirty: false,
            draftAvailable: false,
          },
          restoredDraft: false,
          invalidationInstructions: [],
        },
      });

      const legacyInitialize = vi.fn().mockResolvedValue({
        success: true,
        data: {
          appointment: sampleAppointment,
          patient: samplePatient,
          vitals: [],
          consultation: null,
          doctorId: 'doctor-1',
          workflowState: 0,
          isDirty: false,
        },
      });

      const serviceShim = new SessionOperationsShim(
        { initializeSession: serviceInitialize } as any,
        { initializeSession: legacyInitialize } as any,
        { id: 'user-1' },
        vi.fn()
      );

      expect(serviceInitialize).not.toHaveBeenCalled();
      expect(legacyInitialize).not.toHaveBeenCalled();

      const serviceResult = await serviceShim.initializeSession(1);

      expect(serviceInitialize).toHaveBeenCalledTimes(1);
      expect(legacyInitialize).toHaveBeenCalledTimes(0);
      expect(serviceResult.success).toBe(true);
      expect((serviceResult as any).data.session.appointment.id).toBe(1);

      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'false';

      const legacyShim = new SessionOperationsShim(
        { initializeSession: serviceInitialize } as any,
        { initializeSession: legacyInitialize } as any,
        { id: 'user-1' },
        vi.fn()
      );

      const legacyResult = await legacyShim.initializeSession(1);

      expect(serviceInitialize).toHaveBeenCalledTimes(1);
      expect(legacyInitialize).toHaveBeenCalledTimes(1);
      expect(legacyResult.success).toBe(true);
      expect((legacyResult as any).data.appointment.id).toBe(1);
    });
  });

  describe('rollback via feature flag', () => {
    it('restores legacy behaviour only by changing shim selection', async () => {
      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'true';

      const serviceInitialize = vi.fn().mockResolvedValue({
        success: true,
        data: {
          session: {
            appointment: sampleAppointment,
            patient: samplePatient,
            vitals: [],
            consultation: null,
            doctorId: 'doctor-1',
            workflowState: 0,
            isDirty: false,
            draftAvailable: false,
          },
          restoredDraft: false,
          invalidationInstructions: [],
        },
      });

      const legacyInitialize = vi.fn().mockResolvedValue({
        success: true,
        data: {
          appointment: sampleAppointment,
          patient: samplePatient,
          vitals: [],
          consultation: null,
          doctorId: 'doctor-1',
          workflowState: 0,
          isDirty: false,
        },
      });

      const shim = new SessionOperationsShim(
        { initializeSession: serviceInitialize } as any,
        { initializeSession: legacyInitialize } as any,
        { id: 'user-1' },
        vi.fn()
      );

      await shim.initializeSession(1);
      expect(serviceInitialize).toHaveBeenCalledTimes(1);
      expect(legacyInitialize).toHaveBeenCalledTimes(0);

      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'false';

      await shim.initializeSession(1);
      expect(serviceInitialize).toHaveBeenCalledTimes(1);
      expect(legacyInitialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('orchestration chain', () => {
    it('delegates completion through SessionService when flag enabled', async () => {
      process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = 'true';

      const completeSession = vi.fn().mockResolvedValue({
        success: true,
        data: {
          completedAppointmentId: 1,
          clearedLocalStorage: true,
          invalidationInstructions: [],
          redirectPath: '/doctor/consultations',
        },
      });

      const shim = new SessionOperationsShim(
        { completeSession } as any,
        { completeConsultation: vi.fn() } as any,
        { id: 'user-1' },
        vi.fn()
      );

      const result = await shim.completeSession(1);
      expect(result.success).toBe(true);
      expect(completeSession).toHaveBeenCalledWith(1, 'user-1');
    });
  });
});
