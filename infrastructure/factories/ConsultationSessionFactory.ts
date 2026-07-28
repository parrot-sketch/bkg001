import { SessionService } from '@/application/services/SessionService';
import { DraftService } from '@/application/services/DraftService';
import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory';
import { InProcessWorkflowEventBus } from '@/application/events/WorkflowEventBus';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';
import { ConsultationWorkflowState, createInitialContext } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import type { GuardContext } from '@/domain/workflows/GuardContext';
import type { WorkflowCoordinatorDependencies } from '@/application/orchestrators/WorkflowCoordinatorDependencies';
import type { QueueApi } from '@/domain/interfaces/services/QueueApi';
import type { INotificationService } from '@/domain/interfaces/services/INotificationService';
import type { IAuditService } from '@/domain/interfaces/services/IAuditService';
import { HttpPatientApi } from '@/lib/api/patient-adapter';
import { HttpConsultationApi } from '@/lib/api/consultation-adapter';
import { HttpDoctorApi } from '@/lib/api/doctor-adapter';
import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft';
import { ApiClient, apiClient as defaultApiClient } from '@/lib/api/client';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { VitalsData } from '@/providers/patient/PatientContextProvider';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { apiClient } from '@/lib/api/client';

export interface SessionUser {
  readonly id: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email: string;
  readonly role: string;
}

export interface ConsultationSessionConfig {
  readonly appointmentId: number;
  readonly user: SessionUser;
  readonly accessToken?: string;
}

export interface SerializedSessionData {
  readonly appointment: {
    readonly id: number;
    readonly patientId: string;
    readonly doctorId: string;
    readonly appointmentDate: string;
    readonly time: string;
    readonly status: string;
    readonly type: string;
    readonly note?: string;
    readonly reason?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly checkedInAt?: string;
    readonly checkedInBy?: string;
    readonly consultationStartedAt?: string;
    readonly consultationEndedAt?: string;
    readonly consultationDuration?: number;
    readonly reviewedAt?: string;
    readonly patient?: {
      readonly id: string;
      readonly firstName: string;
      readonly lastName: string;
      readonly fullName: string;
      readonly fileNumber: string;
      readonly dateOfBirth: string;
      readonly gender: string;
      readonly phone?: string;
      readonly profileImage?: string | null;
    };
    readonly doctor?: {
      readonly id: string;
      readonly name: string;
      readonly specialization?: string;
    };
  };
  readonly patient: {
    readonly id: string;
    readonly fileNumber: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly dateOfBirth: string;
    readonly age: number;
    readonly gender: string;
    readonly email: string;
    readonly phone: string;
    readonly whatsappPhone?: string;
    readonly address?: string;
    readonly occupation?: string;
    readonly maritalStatus?: string;
    readonly emergencyContactName?: string;
    readonly emergencyContactNumber?: string;
    readonly relation?: string;
    readonly hasPrivacyConsent?: boolean;
    readonly hasServiceConsent?: boolean;
    readonly hasMedicalConsent?: boolean;
    readonly bloodGroup?: string;
    readonly allergies?: string;
    readonly medicalConditions?: string;
    readonly medicalHistory?: string;
    readonly insuranceProvider?: string;
    readonly insuranceNumber?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly profileImage?: string | null;
    readonly colorCode?: string;
    readonly lastVisitDate?: string;
    readonly assignedAt?: string | null;
    readonly visitCount?: number;
  };
  readonly vitals: {
    readonly bodyTemperature: number | null;
    readonly systolic: number | null;
    readonly diastolic: number | null;
    readonly heartRate: string | null;
    readonly respiratoryRate: number | null;
    readonly oxygenSaturation: number | null;
    readonly weight: number | null;
    readonly height: number | null;
    readonly recordedAt: string;
    readonly recordedBy: string | null;
  } | null;
  readonly consultation: {
    readonly id: number;
    readonly appointmentId: number;
    readonly doctorId: string;
    readonly userId?: string;
    readonly state: string;
    readonly startedAt?: string;
    readonly completedAt?: string;
    readonly durationMinutes?: number;
    readonly notes?: {
      readonly fullText: string;
      readonly structured?: {
        readonly chiefComplaint?: string;
        readonly examination?: string;
        readonly assessment?: string;
        readonly plan?: string;
      };
    };
    readonly outcomeType?: ConsultationOutcomeType;
    readonly patientDecision?: PatientDecision;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly followUp?: {
      readonly date?: string;
      readonly type?: string;
      readonly notes?: string;
    };
  } | null;
  readonly doctorId: string;
  readonly workflowState: string;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}

export interface ConsultationSessionResult {
  readonly initialSession: SerializedSessionData;
  readonly restoredDraft: boolean;
  readonly invalidationInstructions: readonly { readonly queryKey: readonly unknown[]; readonly direction: 'invalidate' | 'refetch' }[];
}

export interface StartSessionResult {
  readonly session: SerializedSessionData;
}

function createNoopQueueApi(): QueueApi {
  return {
    loadQueue: async () => ({ success: true, data: [] }),
    loadPatientQueue: async () => ({ success: true, data: [] }),
  } as unknown as QueueApi;
}

function createNoopNotificationService(): INotificationService {
  return {
    sendInApp: async () => {},
    sendEmail: async () => ({ success: true }),
  } as unknown as INotificationService;
}

function createNoopAuditService(): IAuditService {
  return {
    recordEvent: async () => ({ success: true }),
  } as unknown as IAuditService;
}

function createNoopTimerService(): WorkflowCoordinatorDependencies['timerService'] {
  return {
    startAutosave: async () => {},
    stopAutosave: async () => {},
    startSessionTimer: async () => {},
    stopSessionTimer: async () => {},
  };
}

function serializeDate(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

function serializeAppointment(appointment: AppointmentResponseDto): SerializedSessionData['appointment'] {
  return {
    ...appointment,
    appointmentDate: serializeDate(appointment.appointmentDate) ?? '',
    reviewedAt: serializeDate(appointment.reviewedAt),
    createdAt: serializeDate(appointment.createdAt),
    updatedAt: serializeDate(appointment.updatedAt),
    checkedInAt: serializeDate(appointment.checkedInAt),
    consultationStartedAt: serializeDate(appointment.consultationStartedAt),
    consultationEndedAt: serializeDate(appointment.consultationEndedAt),
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
          fullName: [appointment.patient.firstName, appointment.patient.lastName].filter(Boolean).join(' ') || appointment.patient.id,
          fileNumber: appointment.patient.fileNumber || '',
          dateOfBirth: serializeDate(appointment.patient.dateOfBirth as Date) ?? '',
          gender: appointment.patient.gender || '',
          phone: appointment.patient.phone,
          profileImage: appointment.patient.img || null,
        }
      : undefined,
  };
}

function serializePatient(patient: PatientResponseDto): SerializedSessionData['patient'] {
  return {
    ...patient,
    dateOfBirth: serializeDate(patient.dateOfBirth) ?? '',
    createdAt: serializeDate(patient.createdAt),
    updatedAt: serializeDate(patient.updatedAt),
    lastVisitDate: serializeDate(patient.lastVisitDate),
    assignedAt: serializeDate(patient.assignedAt) ?? null,
  };
}

function serializeConsultation(consultation: ConsultationResponseDto): SerializedSessionData['consultation'] {
  return {
    id: consultation.id,
    appointmentId: consultation.appointmentId,
    doctorId: consultation.doctorId,
    userId: consultation.userId,
    state: consultation.state,
    startedAt: serializeDate(consultation.startedAt),
    completedAt: serializeDate(consultation.completedAt),
    durationMinutes: consultation.durationMinutes,
    notes: consultation.notes,
    outcomeType: consultation.outcomeType,
    patientDecision: consultation.patientDecision,
    createdAt: serializeDate(consultation.createdAt) ?? '',
    updatedAt: serializeDate(consultation.updatedAt) ?? '',
    followUp: consultation.followUp
      ? {
          date: serializeDate(consultation.followUp.date),
          type: consultation.followUp.type,
          notes: consultation.followUp.notes,
        }
      : undefined,
  };
}

function serializeVitals(vitals: VitalsData): SerializedSessionData['vitals'] {
  return {
    ...vitals,
    recordedAt: typeof vitals.recordedAt === 'string' ? vitals.recordedAt : new Date(vitals.recordedAt).toISOString(),
  };
}

function serializeSession(session: {
  readonly appointment: AppointmentResponseDto;
  readonly patient: PatientResponseDto;
  readonly vitals: VitalsData | null;
  readonly consultation: any;
  readonly doctorId: string;
  readonly workflowState: string;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}): SerializedSessionData {
  return {
    appointment: serializeAppointment(session.appointment),
    patient: serializePatient(session.patient),
    vitals: session.vitals ? serializeVitals(session.vitals) : null,
    consultation: session.consultation ? serializeConsultation(session.consultation as ConsultationResponseDto) : null,
    doctorId: session.doctorId,
    workflowState: session.workflowState as string,
    isDirty: session.isDirty,
    draftAvailable: session.draftAvailable,
    notes: session.notes,
    outcomeType: session.outcomeType,
    patientDecision: session.patientDecision,
  };
}

interface SessionServiceContainer {
  readonly sessionService: SessionService;
  readonly serialize: (session: {
    readonly appointment: AppointmentResponseDto;
    readonly patient: PatientResponseDto;
    readonly vitals: VitalsData | null;
    readonly consultation: any;
    readonly doctorId: string;
    readonly workflowState: string;
    readonly isDirty: boolean;
    readonly draftAvailable: boolean;
    readonly notes: StructuredNotes;
    readonly outcomeType: ConsultationOutcomeType | null;
    readonly patientDecision: PatientDecision | null;
  }) => SerializedSessionData;
}

function createSessionServiceContainer(config: ConsultationSessionConfig): SessionServiceContainer {
  const perRequestApiClient = new ApiClient();
  if (typeof window === 'undefined' && config.accessToken) {
    perRequestApiClient.setAuthTokenProvider(() => config.accessToken as string);
  }
  const serverBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  perRequestApiClient.setBaseUrl(`${serverBaseUrl}/api`);

  const httpPatientApi = new HttpPatientApi(perRequestApiClient);
  const httpConsultationApi = new HttpConsultationApi(perRequestApiClient);
  const httpDoctorApi = new HttpDoctorApi(perRequestApiClient);
  const localStorageDraftStorage = new LocalStorageDraftStorage<StructuredNotes>();

  const registry = new DefaultGuardRegistry();

  const initialContext: Partial<GuardContext> = {
    appointmentId: config.appointmentId,
    user: {
      id: config.user.id,
      role: config.user.role as any,
      name: [config.user.firstName, config.user.lastName].filter(Boolean).join(' ') || config.user.id,
    },
  };

  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });

  const engine = new WorkflowEngine(
    ConsultationWorkflowState.IDLE,
    DocumentationWorkflowState.Document,
    initialContext as GuardContext,
    { registry, shortCircuit: false }
  );

  const draftService = new DraftService(httpConsultationApi, localStorageDraftStorage);

  const coordinator = createWorkflowCoordinator({
    dependencies: {
      draftService,
      patientApi: httpPatientApi,
      queueApi: createNoopQueueApi(),
      notificationService: createNoopNotificationService(),
      auditService: createNoopAuditService(),
      timerService: createNoopTimerService(),
      workflowEngine: engine,
      eventBus,
    } as any as WorkflowCoordinatorDependencies,
    context: initialContext as GuardContext,
  });

  const sessionService = new SessionService(
    coordinator,
    httpDoctorApi,
    httpConsultationApi,
    httpPatientApi,
    draftService
  );

  return {
    sessionService,
    serialize: serializeSession,
  };
}

export async function createConsultationSession(config: ConsultationSessionConfig): Promise<ConsultationSessionResult> {
  const container = createSessionServiceContainer(config);

  const initResult = await container.sessionService.initializeSession(config.appointmentId, config.user.id);

  if (!initResult.success) {
    throw new Error(initResult.error.message || 'Failed to initialize session');
  }

  const session = initResult.data.session;

  return {
    initialSession: container.serialize(session),
    restoredDraft: initResult.data.restoredDraft,
    invalidationInstructions: initResult.data.invalidationInstructions,
  };
}

export async function startConsultationSession(config: ConsultationSessionConfig, appointmentId: number, doctorId: string): Promise<StartSessionResult> {
  const container = createSessionServiceContainer(config);

  const result = await container.sessionService.startSession(appointmentId, doctorId, config.user.id);

  if (!result.success) {
    throw new Error(result.error.message || 'Failed to start consultation');
  }

  const session = result.data;

  return {
    session: container.serialize(session),
  };
}

export interface ResumeSessionResult {
  readonly session: SerializedSessionData;
}

export async function resumeConsultationSession(config: ConsultationSessionConfig, appointmentId: number): Promise<ResumeSessionResult> {
  const container = createSessionServiceContainer(config);

  const result = await container.sessionService.resumeSession(appointmentId);

  if (!result.success) {
    throw new Error(result.error.message || 'Failed to resume consultation');
  }

  const session = result.data;

  return {
    session: container.serialize(session),
  };
}

export interface CompleteSessionResult {
  readonly completedAppointmentId: number;
  readonly clearedLocalStorage: boolean;
  readonly invalidationInstructions: readonly { readonly queryKey: readonly unknown[]; readonly direction: 'invalidate' | 'refetch' }[];
  readonly redirectPath: string;
}

export async function completeConsultationSession(config: ConsultationSessionConfig, appointmentId: number): Promise<CompleteSessionResult> {
  const container = createSessionServiceContainer(config);

  const result = await container.sessionService.completeSession(appointmentId, config.user.id);

  if (!result.success) {
    throw new Error(result.error.message || 'Failed to complete consultation');
  }

  return result.data;
}

export interface RefreshPatientResult {
  readonly patient: any;
}

export async function refreshPatientSession(config: ConsultationSessionConfig, patientId: string): Promise<RefreshPatientResult> {
  const container = createSessionServiceContainer(config);

  const result = await container.sessionService.refreshPatient(patientId);

  if (!result.success) {
    throw new Error(result.error.message || 'Failed to refresh patient');
  }

  return result.data;
}

export interface SwitchPatientResult {
  readonly fromAppointmentId: number;
  readonly toAppointmentId: number;
  readonly draftSaved: boolean;
  readonly nextSession: SerializedSessionData;
}

export async function switchPatientSession(config: ConsultationSessionConfig, fromAppointmentId: number, toAppointmentId: number): Promise<SwitchPatientResult> {
  const container = createSessionServiceContainer(config);

  const result = await container.sessionService.switchSession(fromAppointmentId, toAppointmentId, config.user.id);

  if (!result.success) {
    throw new Error(result.error.message || 'Failed to switch patient');
  }

  const next = result.data.nextSession;
  if (!next) {
    throw new Error('No session returned after switching patient');
  }

  return {
    fromAppointmentId: result.data.fromAppointmentId,
    toAppointmentId: result.data.toAppointmentId,
    draftSaved: result.data.draftSaved,
    nextSession: container.serialize(next.session),
  };
}
