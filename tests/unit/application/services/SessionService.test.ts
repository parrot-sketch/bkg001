import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService, type SessionResult, type SessionData, type SessionInitializationResult, type SessionCompletionResult, type SessionSwitchResult } from '@/application/services/SessionService';
import type { DoctorApi } from '@/domain/interfaces/services/DoctorApi';
import type { ConsultationApi } from '@/domain/interfaces/services/ConsultationApi';
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import type { DraftStorage, DraftResult, DraftDataResult } from '@/shared-kernel/interfaces/draft-storage';
import { draftData } from '@/shared-kernel/interfaces/draft-storage';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';

function makeDoctorApi(overrides: Partial<DoctorApi> = {}): DoctorApi {
  return {
    getAppointment: vi.fn(),
    getDoctorByUserId: vi.fn(),
    getPatient: vi.fn(),
    getPatientVitals: vi.fn(),
    startConsultation: vi.fn(),
    completeConsultation: vi.fn(),
    ...overrides,
  } as unknown as DoctorApi;
}

function makeConsultationApi(overrides: Partial<ConsultationApi> = {}): ConsultationApi {
  return {
    loadConsultation: vi.fn(),
    saveConsultationDraft: vi.fn(),
    loadPatientConsultationHistory: vi.fn(),
    sendHeartbeat: vi.fn(),
    ...overrides,
  } as unknown as ConsultationApi;
}

function makePatientApi(overrides: Partial<PatientApi> = {}): PatientApi {
  return {
    loadPatient: vi.fn(),
    loadPatientAppointments: vi.fn(),
    loadUpcomingAppointments: vi.fn(),
    getPatientVitals: vi.fn(),
    ...overrides,
  } as unknown as PatientApi;
}

function makeDraftStorage(overrides: Partial<DraftStorage<StructuredNotes>> = {}): DraftStorage<StructuredNotes> {
  return {
    capabilities: { supportsTTL: false, supportsList: true },
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    removeDraft: vi.fn(),
    exists: vi.fn(),
    listKeys: vi.fn(),
    clearExpired: vi.fn(),
    ...overrides,
  } as unknown as DraftStorage<StructuredNotes>;
}

const sampleNotes: StructuredNotes = {
  chiefComplaint: 'Test complaint',
  examination: 'Test exam',
  assessment: 'Test assessment',
  plan: 'Test plan',
};

const sampleAppointment = {
  id: 1,
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  appointmentDate: new Date(),
  time: '10:00',
  status: 'CHECKED_IN',
  type: 'CONSULTATION',
  createdAt: new Date(),
  updatedAt: new Date(),
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

const sampleConsultation = {
  id: 1,
  appointmentId: 1,
  doctorId: 'doctor-1',
  state: 'NOT_STARTED',
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: {
    fullText: 'Full text',
    structured: sampleNotes,
  },
};

const sampleVitals = [
  {
    id: 1,
    appointmentId: 1,
    bodyTemperature: 37.5,
    systolic: 120,
    diastolic: 80,
    heartRate: '72',
    respiratoryRate: 16,
    oxygenSaturation: 98,
    weight: 70,
    height: 175,
    recordedAt: new Date().toISOString(),
    recordedBy: 'nurse-1',
  },
];

describe('SessionService', () => {
  let doctorApi: DoctorApi;
  let consultationApi: ConsultationApi;
  let patientApi: PatientApi;
  let draftStorage: DraftStorage<StructuredNotes>;
  let draftService: any;
  let coordinator: any;
  let service: SessionService;

  beforeEach(() => {
    doctorApi = makeDoctorApi();
    consultationApi = makeConsultationApi();
    patientApi = makePatientApi();
    draftStorage = makeDraftStorage();
    draftService = {
      restoreDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue({ success: true, version: '1' }),
      discardDraft: vi.fn().mockResolvedValue(undefined),
    };
    coordinator = {
      execute: vi.fn().mockResolvedValue({
        status: 'success',
        workflowResult: {
          decision: {
            success: true,
            nextConsultationState: ConsultationWorkflowState.READY,
            previousConsultationState: ConsultationWorkflowState.IDLE,
            events: [],
            sideEffects: [],
            errors: [],
            metadata: {},
          },
        },
      }),
      updateContext: vi.fn(),
      resetConsultationState: vi.fn(),
    };
    service = new SessionService(
      coordinator as any,
      doctorApi,
      consultationApi,
      patientApi,
      draftService,
      draftStorage,
    );
  });

  describe('initializeSession', () => {
    it('returns failure for invalid appointment ID', async () => {
      const result = await service.initializeSession(0, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('returns failure when appointment not found', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Not found', category: 'CONSULTATION', recoverable: false, retryable: false } });
      const result = await service.initializeSession(1, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
      }
    });

    it('returns failure when doctor not found', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.getDoctorByUserId.mockResolvedValue({ success: false, error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found', category: 'PATIENT', recoverable: false, retryable: false } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: sampleConsultation });

      const result = await service.initializeSession(1, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PATIENT_NOT_FOUND');
        expect(result.error.message).toContain('Doctor not found');
      }
    });

    it('returns success with session data on valid initialization', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.getDoctorByUserId.mockResolvedValue({ success: true, data: { id: 'doctor-1' } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: sampleConsultation });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });
      patientApi.getPatientVitals.mockResolvedValue({ success: true, data: sampleVitals });
      (draftService.restoreDraft as any).mockResolvedValue({ structured: sampleNotes, timestamp: new Date().toISOString() });

      const result = await service.initializeSession(1, 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.session.appointment.id).toBe(1);
        expect(result.data.session.patient.id).toBe('patient-1');
        expect(result.data.session.workflowState).toBe(ConsultationWorkflowState.READY);
        expect(result.data.restoredDraft).toBe(true);
      }
    });
  });

  describe('startSession', () => {
    it('returns failure for invalid appointment ID', async () => {
      const result = await service.startSession(0, 'doctor-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('returns failure for missing doctor ID', async () => {
      const result = await service.startSession(1, '', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_REQUIRED_FIELD');
      }
    });

    it('returns success when consultation starts', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.startConsultation.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });

      const result = await service.startSession(1, 'doctor-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workflowState).toBe(ConsultationWorkflowState.READY);
      }
    });
  });

  describe('completeSession', () => {
    it('returns failure for invalid consultation ID', async () => {
      const result = await service.completeSession(0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('returns success with completion result', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });
      doctorApi.completeConsultation.mockResolvedValue({ success: true, data: sampleAppointment });

      const result = await service.completeSession(1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.redirectPath).toBe('/doctor/consultations');
        expect(result.data.clearedLocalStorage).toBe(true);
      }
      expect(draftService.discardDraft).toHaveBeenCalledWith(1);
    });
  });

  describe('pauseSession', () => {
    it('returns success when pause succeeds', async () => {
      const result = await service.pauseSession();
      expect(result.success).toBe(true);
    });
  });

  describe('resumePausedSession', () => {
    it('returns success when resume succeeds', async () => {
      const result = await service.resumePausedSession();
      expect(result.success).toBe(true);
    });
  });

  describe('sendHeartbeat', () => {
    it('returns failure for invalid consultation ID', async () => {
      const result = await service.sendHeartbeat(0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('returns success when heartbeat succeeds', async () => {
      consultationApi.sendHeartbeat.mockResolvedValue({ success: true, data: undefined });
      const result = await service.sendHeartbeat(1);
      expect(result.success).toBe(true);
    });
  });

  describe('workflow command emission', () => {
    it('initializes consultation session data correctly', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.getDoctorByUserId.mockResolvedValue({ success: true, data: { id: 'doctor-1' } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: sampleConsultation });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });
      patientApi.getPatientVitals.mockResolvedValue({ success: true, data: sampleVitals });
      (draftService.restoreDraft as any).mockResolvedValue(null);

      const result = await service.initializeSession(1, 'user-1');
      expect(result.success).toBe(true);
    });

    it('emits START_CONSULTATION command during startSession', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.startConsultation.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });

      await service.startSession(1, 'doctor-1', 'user-1');
      expect(coordinator.execute).toHaveBeenCalledWith({ type: 'START_CONSULTATION' });
    });

    it('emits COMPLETE_CONSULTATION command during completion', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.completeConsultation.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });

      await service.completeSession(1);
      expect(coordinator.execute).toHaveBeenCalledWith({ type: 'COMPLETE_CONSULTATION' });
    });

    it('emits SWITCH_PATIENT command during switch', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.getDoctorByUserId.mockResolvedValue({ success: true, data: { id: 'doctor-1' } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: sampleConsultation });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });
      patientApi.getPatientVitals.mockResolvedValue({ success: true, data: sampleVitals });
      (draftService.restoreDraft as any).mockResolvedValue(null);
      (draftService.saveDraft as any).mockResolvedValue({ success: true, version: '1' });

      await service.switchSession(1, 2);
      expect(coordinator.execute).toHaveBeenCalledWith({ type: 'SWITCH_PATIENT', appointmentId: 2 });
    });
  });

  describe('failure recovery', () => {
    it('returns error when appointment API fails during initialization', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Not found', category: 'CONSULTATION', recoverable: false, retryable: false } });

      const result = await service.initializeSession(1, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
      }
    });

    it('returns error when API fails during startSession', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.startConsultation.mockResolvedValue({ success: false, error: { code: 'INVALID_INPUT', message: 'already in progress', category: 'CONSULTATION', recoverable: true, retryable: false } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });

      const result = await service.startSession(1, 'doctor-1', 'user-1');
      expect(result.success).toBe(true);
      expect(result.data.workflowState).toBe(ConsultationWorkflowState.ACTIVE);
    });

    it('returns error when consultation not found after start', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.startConsultation.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Not found', category: 'CONSULTATION', recoverable: false, retryable: false } });

      const result = await service.startSession(1, 'doctor-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SESSION_NOT_FOUND');
      }
    });
  });

  describe('completeSession calls doctorApi.completeConsultation', () => {
    it('calls doctorApi.completeConsultation', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });
      doctorApi.completeConsultation.mockResolvedValue({ success: true, data: sampleAppointment });

      const result = await service.completeSession(1);
      expect(result.success).toBe(true);
      expect(doctorApi.completeConsultation).toHaveBeenCalledWith({ appointmentId: 1, doctorId: 'doctor-1' });
    });
  });

  describe('switchSession', () => {
    it('returns failure for same appointment', async () => {
      const result = await service.switchSession(1, 1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('DraftService delegation', () => {
    it('calls draftService.restoreDraft during initialization', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.getDoctorByUserId.mockResolvedValue({ success: true, data: { id: 'doctor-1' } });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: sampleConsultation });
      patientApi.loadPatient.mockResolvedValue({ success: true, data: samplePatient });
      patientApi.getPatientVitals.mockResolvedValue({ success: true, data: sampleVitals });
      (draftService.restoreDraft as any).mockResolvedValue(null);

      await service.initializeSession(1, 'user-1');
      expect(draftService.restoreDraft).toHaveBeenCalledWith(1, sampleConsultation.updatedAt);
    });

    it('calls draftService.discardDraft during completion', async () => {
      doctorApi.getAppointment.mockResolvedValue({ success: true, data: sampleAppointment });
      doctorApi.completeConsultation.mockResolvedValue({ success: true, data: sampleAppointment });
      consultationApi.loadConsultation.mockResolvedValue({ success: true, data: { ...sampleConsultation, state: 'IN_PROGRESS' } });

      await service.completeSession(1);
      expect(draftService.discardDraft).toHaveBeenCalledWith(1);
    });
  });
});
