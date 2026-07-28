/**
 * Application Layer — SessionService
 *
 * The Application Service responsible for the complete consultation session lifecycle.
 *
 * Responsibilities:
 * - Consultation initialization (parallel data fetch, draft restore, workflow transition)
 * - Session start, resume, pause, resume, completion, cancellation
 * - Patient switching with dirty-save safety
 * - Queue advancement
 * - Heartbeat coordination
 * - Cache invalidation coordination
 * - Error mapping to clinical error taxonomy
 *
 * Does NOT own:
 * - Draft persistence (belongs to DraftService)
 * - Workflow state transitions (belongs to WorkflowEngine via WorkflowCoordinator)
 * - React state, reducers, UI, notifications, navigation
 * - Direct API completion calls (Presentation Layer responsibility)
 */

import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator';
import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand';
import type { WorkflowCoordinatorResult } from '@/application/orchestrators/WorkflowCoordinatorResult';
import type { DoctorApi } from '@/domain/interfaces/services/DoctorApi';
import type { ConsultationApi } from '@/domain/interfaces/services/ConsultationApi';
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import { DraftService } from '@/application/services/DraftService';
import { ClinicalErrorCode, ClinicalErrorCategory, ClinicalErrorSeverity } from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import type { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import type { PatientDecision } from '@/domain/enums/PatientDecision';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import type { VitalsData } from '@/providers/patient/PatientContextProvider';
import { parseLegacyNotes } from '@/shared-kernel/utils/note-serialization';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import db from '@/lib/db';

export type SessionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: SessionError };

export interface SessionError {
  readonly code: ClinicalErrorCode;
  readonly message: string;
  readonly category: ClinicalErrorCategory;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

export type SessionVoid = SessionResult<void>;

export interface SessionData {
  readonly appointment: {
    readonly id: number;
    readonly patientId: string;
    readonly doctorId: string;
    readonly appointmentDate: Date;
    readonly time: string;
    readonly status: string;
    readonly type: string;
    readonly note?: string;
    readonly reason?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly checkedInAt?: Date;
    readonly checkedInBy?: string;
    readonly consultationStartedAt?: Date;
    readonly consultationEndedAt?: Date;
    readonly consultationDuration?: number;
    readonly patient?: {
      readonly id: string;
      readonly firstName: string;
      readonly lastName: string;
      readonly email?: string;
      readonly phone?: string;
      readonly fileNumber?: string;
      readonly img?: string | null;
      readonly dateOfBirth?: string | Date;
      readonly gender?: string;
      readonly allergies?: string;
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
    readonly dateOfBirth: Date;
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
    readonly hasPrivacyConsent: boolean;
    readonly hasServiceConsent: boolean;
    readonly hasMedicalConsent: boolean;
    readonly bloodGroup?: string;
    readonly allergies?: string;
    readonly medicalConditions?: string;
    readonly medicalHistory?: string;
    readonly insuranceProvider?: string;
    readonly insuranceNumber?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly profileImage?: string;
  };
  readonly vitals: VitalsData | null;
  readonly consultation: {
    readonly id: number;
    readonly appointmentId: number;
    readonly doctorId: string;
    readonly userId?: string;
    readonly state: string;
    readonly startedAt?: Date;
    readonly completedAt?: Date;
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
  } | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}

export interface SessionInitializationResult {
  readonly session: SessionData;
  readonly restoredDraft: boolean;
  readonly invalidationInstructions: InvalidationInstruction[];
}

export interface SessionCompletionResult {
  readonly completedAppointmentId: number;
  readonly clearedLocalStorage: boolean;
  readonly invalidationInstructions: InvalidationInstruction[];
  readonly redirectPath: string;
}

export interface SessionSwitchResult {
  readonly fromAppointmentId: number;
  readonly toAppointmentId: number;
  readonly draftSaved: boolean;
  readonly nextSession: SessionInitializationResult | null;
}

export interface InvalidationInstruction {
  readonly queryKey: readonly unknown[];
  readonly direction: 'invalidate' | 'refetch';
}

export class SessionService {
  constructor(
    private readonly coordinator: WorkflowCoordinator,
    private readonly doctorApi: DoctorApi,
    private readonly consultationApi: ConsultationApi,
    private readonly patientApi: PatientApi,
    private readonly draftService: DraftService,
  ) {}

  async initializeSession(appointmentId: number, userId: string): Promise<SessionResult<SessionInitializationResult>> {
    console.log('[TRACE] SessionService.initializeSession ENTER', { appointmentId, userId });
    if (appointmentId <= 0) {
      console.warn('[TRACE] Invalid appointment ID');
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid appointment ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    if (!userId) {
      console.warn('[TRACE] Missing userId');
      return { success: false, error: makeError(ClinicalErrorCode.MISSING_REQUIRED_FIELD, 'User ID is required', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    let appointment: SessionData['appointment'] | null = null;
    let doctorId: string | null = null;
    let patient: SessionData['patient'] | null = null;
    let vitals: VitalsData | null = null;
    let consultation: SessionData['consultation'] | null = null;

    console.log('[TRACE] SessionService.initializeSession: fetching appointment, doctor, consultation');
    const [appointmentResult, doctorResult, consultationResult] = await Promise.all([
      this.doctorApi.getAppointment(appointmentId),
      this.doctorApi.getDoctorByUserId(userId),
      this.consultationApi.loadConsultation(appointmentId),
    ]);

    if (!appointmentResult.success || !appointmentResult.data) {
      const cause = appointmentResult && typeof appointmentResult === 'object' && 'error' in appointmentResult ? (appointmentResult as any).error : undefined;
      return { success: false, error: makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false, cause) };
    }
    appointment = appointmentResult.data as SessionData['appointment'];

    if (!doctorResult.success || !doctorResult.data) {
      const cause = doctorResult && typeof doctorResult === 'object' && 'error' in doctorResult ? (doctorResult as any).error : undefined;
      return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Doctor not found', ClinicalErrorCategory.PATIENT, false, false, cause) };
    }
    doctorId = (doctorResult.data as any).id;

    consultation = consultationResult.success ? (consultationResult.data as any) : null;

    const [patientResult, vitalsResult] = await Promise.all([
      this.patientApi.loadPatient(appointment.patientId),
      this.patientApi.getPatientVitals(appointment.patientId, appointmentId),
    ]);

    if (!patientResult.success || !patientResult.data) {
      const cause = patientResult && typeof patientResult === 'object' && 'error' in patientResult ? (patientResult as any).error : undefined;
      return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Patient not found', ClinicalErrorCategory.PATIENT, false, false, cause) };
    }
    patient = patientResult.data as SessionData['patient'];

    if (vitalsResult.success && vitalsResult.data && vitalsResult.data.length > 0) {
      const raw = vitalsResult.data[0];
      vitals = {
        bodyTemperature: raw.bodyTemperature ?? null,
        systolic: raw.systolic ?? null,
        diastolic: raw.diastolic ?? null,
        heartRate: raw.heartRate ?? null,
        respiratoryRate: raw.respiratoryRate ?? null,
        oxygenSaturation: raw.oxygenSaturation ?? null,
        weight: raw.weight ?? null,
        height: raw.height ?? null,
        recordedAt: raw.recordedAt,
        recordedBy: raw.recordedBy ?? null,
      };
    }

    let notes: StructuredNotes = {};
    let restoredDraft = false;

    if (consultation?.notes?.structured) {
      notes = consultation.notes.structured;
    } else if (consultation?.notes?.fullText) {
      notes = parseLegacyNotes(consultation.notes.fullText);
    }

    const draftRecord = await this.draftService.restoreDraft(appointmentId, consultation?.updatedAt);
    if (draftRecord) {
      notes = draftRecord.structured;
      restoredDraft = true;
    }

    let outcomeType: ConsultationOutcomeType | null = null;
    let patientDecision: PatientDecision | null = null;

    if (consultation?.outcomeType) {
      outcomeType = consultation.outcomeType;
    }
    if (consultation?.patientDecision) {
      patientDecision = consultation.patientDecision;
    }

    const workflowState = this.determineInitialWorkflowState(appointment, consultation);

    const sessionData: SessionData = {
      appointment,
      patient: patient!,
      vitals,
      consultation,
      doctorId: doctorId!,
      workflowState,
      isDirty: restoredDraft,
      draftAvailable: false,
      notes,
      outcomeType,
      patientDecision,
    };

    const invalidationInstructions: InvalidationInstruction[] = [
      { queryKey: ['consultation', appointmentId], direction: 'invalidate' },
      { queryKey: ['doctor', doctorId!], direction: 'invalidate' },
      { queryKey: ['appointments'], direction: 'invalidate' },
    ];

    return {
      success: true,
      data: {
        session: sessionData,
        restoredDraft,
        invalidationInstructions,
      },
    };
  }

  async startSession(appointmentId: number, doctorId: string, userId: string): Promise<SessionResult<SessionData>> {
    console.log('[TRACE] SessionService.startSession ENTER', { appointmentId, doctorId, userId });
    if (appointmentId <= 0) {
      console.warn('[TRACE] Invalid appointment ID');
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid appointment ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }
    if (!doctorId) {
      console.warn('[TRACE] Missing doctorId');
      return { success: false, error: makeError(ClinicalErrorCode.MISSING_REQUIRED_FIELD, 'Doctor ID is required', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const appointmentResult = await this.doctorApi.getAppointment(appointmentId);
    if (!appointmentResult.success || !appointmentResult.data) {
      const cause = appointmentResult && typeof appointmentResult === 'object' && 'error' in appointmentResult ? (appointmentResult as any).error : undefined;
      return { success: false, error: makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false, cause) };
    }

    let notes: StructuredNotes = {};
    let outcomeType: ConsultationOutcomeType | null = null;
    let patientDecision: PatientDecision | null = null;

    const [patientResult, startResult] = await Promise.all([
      this.patientApi.loadPatient(appointmentResult.data.patientId),
      this.doctorApi.startConsultation({ appointmentId, doctorId, userId }),
    ]);

    if (!startResult.success) {
      const error = this.mapDoctorApiError(startResult);
      if (error.code === ClinicalErrorCode.INVALID_INPUT && /in.?progress/i.test(error.message)) {
        const refreshResult = await this.consultationApi.loadConsultation(appointmentId);
        if (refreshResult.success && refreshResult.data) {
          if (!patientResult.success || !patientResult.data) {
            return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Patient not found', ClinicalErrorCategory.PATIENT, false, false) };
          }
          const consultationNotes = refreshResult.data.notes?.structured ?? (refreshResult.data.notes?.fullText ? parseLegacyNotes(refreshResult.data.notes.fullText) : {});
          return {
            success: true,
            data: this.buildSessionData(appointmentResult.data as SessionData['appointment'], patientResult.data as SessionData['patient'], refreshResult.data as any, doctorId, ConsultationWorkflowState.ACTIVE, false, consultationNotes, refreshResult.data.outcomeType ?? null, refreshResult.data.patientDecision ?? null),
          };
        }
      }
      return { success: false, error };
    }

    const consultationResult = await this.consultationApi.loadConsultation(appointmentId);
    if (!consultationResult.success || !consultationResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found after start', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    if (consultationResult.data.notes?.structured) {
      notes = consultationResult.data.notes.structured;
    } else if (consultationResult.data.notes?.fullText) {
      notes = parseLegacyNotes(consultationResult.data.notes.fullText);
    }
    outcomeType = consultationResult.data.outcomeType ?? null;
    patientDecision = consultationResult.data.patientDecision ?? null;

    if (!patientResult.success || !patientResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Patient not found', ClinicalErrorCategory.PATIENT, false, false) };
    }

    const command: WorkflowCommand = { type: 'START_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      const error = this.mapCoordinatorError(coordinatorResult.error);
      return { success: false, error };
    }

    return {
      success: true,
      data: this.buildSessionData(appointmentResult.data as SessionData['appointment'], patientResult.data as SessionData['patient'], consultationResult.data as any, doctorId, coordinatorResult.data.workflowState, false, notes, outcomeType, patientDecision),
    };
  }

  async resumeSession(appointmentId: number): Promise<SessionResult<SessionData>> {
    console.log('[TRACE] SessionService.resumeSession ENTER', { appointmentId });
    if (appointmentId <= 0) {
      console.warn('[TRACE] Invalid appointment ID');
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid appointment ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const consultationResult = await this.consultationApi.loadConsultation(appointmentId);
    if (!consultationResult.success || !consultationResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    const consultation = consultationResult.data as any;
    if (consultation.state !== 'IN_PROGRESS') {
      return { success: false, error: makeError(ClinicalErrorCode.VALIDATION_ERROR, 'Consultation is not in progress', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const appointmentResult = await this.doctorApi.getAppointment(appointmentId);
    if (!appointmentResult.success || !appointmentResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    const patientResult = await this.patientApi.loadPatient(appointmentResult.data.patientId);
    if (!patientResult.success || !patientResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Patient not found', ClinicalErrorCategory.PATIENT, false, false) };
    }

    let notes: StructuredNotes = {};
    let outcomeType: ConsultationOutcomeType | null = null;
    let patientDecision: PatientDecision | null = null;

    if (consultation.notes?.structured) {
      notes = consultation.notes.structured;
    } else if (consultation.notes?.fullText) {
      notes = parseLegacyNotes(consultation.notes.fullText);
    }
    outcomeType = consultation.outcomeType ?? null;
    patientDecision = consultation.patientDecision ?? null;

    const command: WorkflowCommand = { type: 'START_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      const error = this.mapCoordinatorError(coordinatorResult.error);
      return { success: false, error };
    }

    return {
      success: true,
      data: this.buildSessionData(appointmentResult.data as SessionData['appointment'], patientResult.data as SessionData['patient'], consultation, consultation.doctorId, coordinatorResult.data.workflowState, false, notes, outcomeType, patientDecision),
    };
  }

  async completeSession(appointmentId: number, userId?: string): Promise<SessionResult<SessionCompletionResult>> {
    if (appointmentId <= 0) {
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid appointment ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    console.log('[SESSION SERVICE completeSession] appointmentId=', appointmentId, 'userId=', userId);
    let consultationResult = await this.consultationApi.loadConsultation(appointmentId);
    let appointmentRes: { success: boolean; data?: any; error?: any } = { success: false };

    if (!consultationResult.success || !consultationResult.data) {
      appointmentRes = await this.doctorApi.getAppointment(appointmentId);
      console.log('[SESSION SERVICE completeSession] getAppointment result=', JSON.stringify({
        success: appointmentRes.success,
        hasData: !!(appointmentRes as any).data,
        doctorId: (appointmentRes as any).data?.doctorId,
        error: (appointmentRes as any).error?.message
      }));
      if ((appointmentRes as any).success && (appointmentRes as any).data) {
        const startResult = await this.doctorApi.startConsultation({
          appointmentId,
          doctorId: (appointmentRes as any).data?.doctorId || '',
          userId: userId || (appointmentRes as any).data?.doctorId || '',
        });
        console.log('[SESSION SERVICE completeSession] startConsultation result=', JSON.stringify({
          success: startResult.success,
          error: (startResult as any).error?.message
        }));
        consultationResult = await this.consultationApi.loadConsultation(appointmentId);
        console.log('[SESSION SERVICE completeSession] retry loadConsultation result=', JSON.stringify({
          success: consultationResult.success,
          hasData: !!(consultationResult as any).data,
          error: (consultationResult as any).error?.message,
          code: (consultationResult as any).error?.code
        }));
      }
    }

    if (!consultationResult.success || !consultationResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    const consultation = consultationResult.data as any;
    if (consultation.state !== 'IN_PROGRESS' && consultation.state !== 'COMPLETED') {
      return { success: false, error: makeError(ClinicalErrorCode.VALIDATION_ERROR, 'Consultation is not in progress', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    if (!appointmentRes.success || !appointmentRes.data) {
      appointmentRes = await this.doctorApi.getAppointment(appointmentId);
    }
    if (!appointmentRes.success || !appointmentRes.data) {
      return { success: false, error: makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    const appointment = appointmentRes.data;
    const toIso = (value: any): string => {
      if (!value) return '';
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return String(value);
    };
    const toMillis = (value: any): number | null => {
      if (!value) return null;
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'string') {
        const millis = new Date(value).getTime();
        return Number.isFinite(millis) ? millis : null;
      }
      return null;
    };

    const effectiveUserId = userId || consultation.userId || '';
    const doctorRecord = effectiveUserId ? await db.doctor.findFirst({
      where: { user_id: effectiveUserId },
      select: { id: true },
    }) : null;

    const contextUserId = effectiveUserId || '';
    const contextDoctorId = doctorRecord?.id ?? appointment.doctorId;

    console.log('[SESSION SERVICE completeSession] ids=', JSON.stringify({
      userId: contextUserId,
      appointmentDoctorId: appointment.doctorId,
      doctorRecordId: doctorRecord?.id ?? null,
      outcomeType: consultation.outcomeType,
      documentationState: DocumentationWorkflowState.Document,
    }));

    this.coordinator.updateContext({
      appointment: {
        id: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        status: appointment.status,
        slotStartTime: '',
        slotDurationMinutes: appointment.consultationDuration || 30,
      },
      consultation: {
        id: consultation.id,
        appointmentId: consultation.appointmentId,
        state: consultation.state,
        version: toIso(consultation.updatedAt),
        updatedAt: toIso(consultation.updatedAt),
      },
      patientId: appointment.patientId,
      consultationId: consultation.id,
      doctorId: appointment.doctorId,
      notes: consultation.notes?.structured ?? (consultation.notes?.fullText ? parseLegacyNotes(consultation.notes.fullText) : {}),
      outcomeType: consultation.outcomeType ?? null,
      patientDecision: consultation.patientDecision ?? null,
      isDirty: false,
      lastSavedAt: toMillis(consultation.updatedAt),
      version: toIso(consultation.updatedAt),
      queue: null,
      hasLocalDraft: false,
      localDraftTimestamp: null,
      user: {
        id: contextUserId,
        role: '',
        name: '',
        doctorId: contextDoctorId,
      },
      documentationWorkflowState: DocumentationWorkflowState.Document,
      consultationWorkflowState: ConsultationWorkflowState.COMPLETING,
    });

    this.coordinator.resetConsultationState(ConsultationWorkflowState.COMPLETING);
    const command: WorkflowCommand = { type: 'COMPLETE_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    console.log('[SESSION SERVICE completeSession] workflowResult=', JSON.stringify({
      success: coordinatorResult.success,
      workflowState: coordinatorResult.success ? coordinatorResult.data?.workflowState : null,
      error: coordinatorResult.success ? null : coordinatorResult.error?.message,
      code: coordinatorResult.success ? null : coordinatorResult.error?.code,
      cause: coordinatorResult.success ? null : (coordinatorResult.error?.cause instanceof Error ? coordinatorResult.error.cause.message : coordinatorResult.error?.cause),
    }));
    if (!coordinatorResult.success) {
      const error = this.mapCoordinatorError(coordinatorResult.error);
      return { success: false, error };
    }

    const completeApiResult = await this.doctorApi.completeConsultation({
      appointmentId,
      doctorId: consultation.doctorId || '',
    });
    console.log('[SESSION SERVICE completeSession] completeConsultation apiResult=', JSON.stringify({
      success: completeApiResult.success,
      error: completeApiResult.success ? null : (completeApiResult as any).error?.message,
      code: completeApiResult.success ? null : (completeApiResult as any).error?.code,
    }));
    if (!completeApiResult.success) {
      return { success: false, error: this.mapDoctorApiError(completeApiResult as any) };
    }

    await this.draftService.discardDraft(consultation.id);

    const invalidationInstructions: InvalidationInstruction[] = [
      { queryKey: ['consultation', consultation.id], direction: 'invalidate' },
      { queryKey: ['consultation'], direction: 'invalidate' },
      { queryKey: ['doctor', consultation.doctorId], direction: 'invalidate' },
      { queryKey: ['appointments'], direction: 'invalidate' },
      { queryKey: ['billing'], direction: 'invalidate' },
      { queryKey: ['appointment-billing'], direction: 'invalidate' },
    ];

    return {
      success: true,
      data: {
        completedAppointmentId: consultation.appointmentId,
        clearedLocalStorage: true,
        invalidationInstructions,
        redirectPath: '/doctor/consultations',
      },
    };
  }

  async refreshPatient(patientId: string): Promise<SessionResult<{ patient: any }>> {
    if (!patientId) {
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid patient ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const patientResult = await this.patientApi.loadPatient(patientId);
    if (!patientResult.success || !patientResult.data) {
      return { success: false, error: makeError(ClinicalErrorCode.PATIENT_NOT_FOUND, 'Patient not found', ClinicalErrorCategory.CONSULTATION, false, false) };
    }

    return {
      success: true,
      data: {
        patient: patientResult.data as any,
      },
    };
  }

  async cancelCompletion(): Promise<SessionResult<SessionData>> {
    const command: WorkflowCommand = { type: 'CANCEL_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      const error = this.mapCoordinatorError(coordinatorResult.error);
      return { success: false, error };
    }

    return {
      success: true,
      data: {
        appointment: null as any,
        patient: null as any,
        vitals: null,
        consultation: null as any,
        doctorId: '',
        workflowState: coordinatorResult.data.workflowState,
        isDirty: false,
        draftAvailable: false,
        notes: {},
        outcomeType: null,
        patientDecision: null,
      },
    };
  }

  async pauseSession(): Promise<SessionVoid> {
    const command: WorkflowCommand = { type: 'PAUSE_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      return { success: false, error: this.mapCoordinatorError(coordinatorResult.error) };
    }
    return { success: true, data: undefined };
  }

  async resumePausedSession(): Promise<SessionVoid> {
    const command: WorkflowCommand = { type: 'RESUME_CONSULTATION' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      return { success: false, error: this.mapCoordinatorError(coordinatorResult.error) };
    }
    return { success: true, data: undefined };
  }

  async switchSession(fromAppointmentId: number, toAppointmentId: number, userId: string): Promise<SessionResult<SessionSwitchResult>> {
    if (fromAppointmentId === toAppointmentId) {
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Cannot switch to the same appointment', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const command: WorkflowCommand = { type: 'SWITCH_PATIENT', appointmentId: toAppointmentId };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      const error = this.mapCoordinatorError(coordinatorResult.error);
      return { success: false, error };
    }

    const nextSessionResult = await this.initializeSession(toAppointmentId, userId);
    if (!nextSessionResult.success) {
      return {
        success: false,
        error: {
          ...nextSessionResult.error,
          message: `Failed to switch: ${nextSessionResult.error.message}`,
        },
      };
    }

    return {
      success: true,
      data: {
        fromAppointmentId,
        toAppointmentId,
        draftSaved: true,
        nextSession: nextSessionResult.data,
      },
    };
  }

  async advanceQueue(doctorId: string, userId: string): Promise<SessionResult<SessionInitializationResult | null>> {
    if (!userId) {
      return { success: false, error: makeError(ClinicalErrorCode.MISSING_REQUIRED_FIELD, 'User ID is required', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const command: WorkflowCommand = { type: 'ADVANCE_QUEUE' };
    const coordinatorResult = await this.executeWorkflowCommand(command);
    if (!coordinatorResult.success) {
      return { success: false, error: this.mapCoordinatorError(coordinatorResult.error) };
    }

    if (coordinatorResult.data.workflowState === ConsultationWorkflowState.COMPLETED) {
      return { success: true, data: null };
    }

    const nextAppointmentId = coordinatorResult.data.metadata?.nextAppointmentId as number | undefined;
    if (!nextAppointmentId) {
      return { success: true, data: null };
    }

    const sessionResult = await this.initializeSession(nextAppointmentId, userId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    return { success: true, data: sessionResult.data };
  }

  async sendHeartbeat(consultationId: number): Promise<SessionVoid> {
    if (consultationId <= 0) {
      return { success: false, error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid consultation ID', ClinicalErrorCategory.VALIDATION, false, false) };
    }

    const result = await this.consultationApi.sendHeartbeat(consultationId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: undefined };
  }

  private determineInitialWorkflowState(appointment: SessionData['appointment'], consultation: SessionData['consultation'] | null): ConsultationWorkflowState {
    const status = appointment.status as AppointmentStatus;
    if (status === AppointmentStatus.COMPLETED || status === AppointmentStatus.CANCELLED) {
      return ConsultationWorkflowState.READY;
    }
    if (status === AppointmentStatus.IN_CONSULTATION || consultation?.state === 'IN_PROGRESS') {
      return ConsultationWorkflowState.ACTIVE;
    }
    if (status === AppointmentStatus.CHECKED_IN || status === AppointmentStatus.READY_FOR_CONSULTATION) {
      return ConsultationWorkflowState.READY;
    }
    return ConsultationWorkflowState.READY;
  }

  private buildSessionData(
    appointment: SessionData['appointment'],
    patient: SessionData['patient'],
    consultation: SessionData['consultation'],
    doctorId: string,
    workflowState: ConsultationWorkflowState,
    isDirty: boolean,
    notes: StructuredNotes = {},
    outcomeType: ConsultationOutcomeType | null = null,
    patientDecision: PatientDecision | null = null,
  ): SessionData {
    return {
      appointment,
      patient,
      vitals: null,
      consultation,
      doctorId,
      workflowState,
      isDirty,
      draftAvailable: false,
      notes,
      outcomeType,
      patientDecision,
    };
  }

  private async executeWorkflowCommand(command: WorkflowCommand): Promise<SessionResult<{ workflowState: ConsultationWorkflowState; metadata: Record<string, unknown> }>> {
    try {
      const result = await this.coordinator.execute(command);
      return this.mapCoordinatorResult(result);
    } catch (error) {
      return { success: false, error: makeError(ClinicalErrorCode.NETWORK_UNAVAILABLE, 'Workflow execution failed', ClinicalErrorCategory.INFRASTRUCTURE, true, true, error) };
    }
  }

  private mapCoordinatorResult(result: WorkflowCoordinatorResult): SessionResult<{ workflowState: ConsultationWorkflowState; metadata: Record<string, unknown> }> {
    const decision = result.workflowResult.decision;
    const workflowState = decision.nextConsultationState || decision.previousConsultationState;

    if (result.status === 'success') {
      return { success: true, data: { workflowState, metadata: decision.metadata } };
    }

    if (result.status === 'partial_success') {
      return { success: true, data: { workflowState, metadata: decision.metadata } };
    }

    const error = makeError(
      ClinicalErrorCode.INVALID_WORKFLOW_TRANSITION,
      decision.errors.map(e => (e as any).message || String(e)).join(', ') || 'Workflow transition failed',
      ClinicalErrorCategory.CONSULTATION,
      true,
      false,
      decision.errors
    );
    return { success: false, error };
  }

  private mapCoordinatorError(error: unknown): SessionError {
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      return error as SessionError;
    }
    return makeError(ClinicalErrorCode.UNKNOWN, 'Unknown workflow error', ClinicalErrorCategory.SYSTEM, true, true, error);
  }

  private mapDoctorApiError(result: { success: boolean; data?: any; error?: ClinicalError }): SessionError {
    if (!result.success && result.error) {
      return result.error;
    }
    return makeError(ClinicalErrorCode.UNKNOWN, 'Unknown API error', ClinicalErrorCategory.SYSTEM, true, true);
  }
}

function makeError(
  code: ClinicalErrorCode,
  message: string,
  category: ClinicalErrorCategory = ClinicalErrorCategory.CONSULTATION,
  recoverable: boolean = true,
  retryable: boolean = false,
  cause?: unknown
): SessionError {
  return {
    code,
    message,
    category,
    recoverable,
    retryable,
    cause,
  };
}
