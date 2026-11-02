'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';
import { createConsultationSession, startConsultationSession, type StartSessionResult, resumeConsultationSession, type ResumeSessionResult, completeConsultationSession, type CompleteSessionResult, refreshPatientSession, type RefreshPatientResult, switchPatientSession } from '@/infrastructure/factories/ConsultationSessionFactory';
import { ClinicalErrorCode, ClinicalErrorCategory } from '@/shared-kernel/errors/codes';
import { Role } from '@/domain/enums/Role';
import { resolveConsultationServiceId } from '@/application/services/billing/resolveConsultationServiceId';
import db from '@/lib/db';
import { cookies } from 'next/headers';

type ActionError = {
  readonly success: false;
  readonly error: {
    readonly code: ClinicalErrorCode;
    readonly message: string;
    readonly category: ClinicalErrorCategory;
    readonly recoverable: boolean;
    readonly retryable: boolean;
    readonly cause?: unknown;
  };
};

type ActionSuccess<T> = {
  readonly success: true;
  readonly data: T;
};

type ActionResult<T> = ActionSuccess<T> | ActionError;

function makeError(
  code: ClinicalErrorCode,
  message: string,
  category: ClinicalErrorCategory = ClinicalErrorCategory.CONSULTATION,
  recoverable: boolean = true,
  retryable: boolean = false,
  cause?: unknown
): ActionError {
  return {
    success: false,
    error: { code, message, category, recoverable, retryable, cause },
  };
}

async function getServerAccessToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('accessToken')?.value;
  } catch {
    return undefined;
  }
}

export async function initializeSession(appointmentId: number): Promise<ActionResult<{
  readonly session: any;
  readonly restoredDraft: boolean;
  readonly invalidationInstructions: readonly { readonly queryKey: readonly unknown[]; readonly direction: 'invalidate' | 'refetch' }[];
}>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const accessToken = await getServerAccessToken();
    const session = await createConsultationSession({ appointmentId, user: { id: user.userId, email: user.email, role: user.role }, accessToken });
    return {
      success: true,
      data: {
        session: session.initialSession,
        restoredDraft: session.restoredDraft,
        invalidationInstructions: session.invalidationInstructions,
      },
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to initialize session', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function startSession(appointmentId: number, doctorId: string): Promise<ActionResult<StartSessionResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const accessToken = await getServerAccessToken();
    const result = await startConsultationSession({ appointmentId, user: { id: user.userId, email: user.email, role: user.role }, accessToken }, appointmentId, doctorId);
    await revalidateFrontdeskDashboard();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Failed to start consultation';
    return makeError(ClinicalErrorCode.UNKNOWN, message, ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function completeSession(appointmentId: number): Promise<ActionResult<CompleteSessionResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const accessToken = await getServerAccessToken();
    const result = await completeConsultationSession({ appointmentId, user: { id: user.userId, email: user.email, role: user.role }, accessToken }, appointmentId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete consultation';
    return makeError(ClinicalErrorCode.UNKNOWN, message, ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function resumeSession(appointmentId: number): Promise<ActionResult<ResumeSessionResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const accessToken = await getServerAccessToken();
    const result = await resumeConsultationSession({ appointmentId, user: { id: user.userId, email: user.email, role: user.role }, accessToken }, appointmentId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to resume consultation', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function cancelCompletion(): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}

export async function switchToPatient(fromAppointmentId: number, toAppointmentId: number): Promise<ActionResult<any>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const accessToken = await getServerAccessToken();
    const result = await switchPatientSession({
      appointmentId: toAppointmentId,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
      accessToken,
    }, fromAppointmentId, toAppointmentId);

    return {
      success: true,
      data: {
        nextSession: {
          session: result.nextSession,
        },
        invalidationInstructions: [
          { queryKey: ['consultation'], direction: 'invalidate' },
          { queryKey: ['appointments'], direction: 'invalidate' },
          { queryKey: ['doctor', result.nextSession.doctorId], direction: 'invalidate' },
          { queryKey: ['doctor', 'dashboard'], direction: 'invalidate' },
        ],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch patient';
    console.error('[switchToPatient] error=', message, 'cause=', error instanceof Error ? error.cause : undefined);
    return makeError(ClinicalErrorCode.UNKNOWN, message, ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function advanceQueue(doctorId: string): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}

export async function sendHeartbeat(consultationId: number): Promise<ActionResult<void>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}

export async function pauseSession(): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}

export async function resumePausedSession(): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}

type ClinicalNoteFields = {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
};

type AuthorizedConsultation = {
  id: number;
  appointment_id: number;
  doctor_id: string;
  completed_at: Date | null;
};

async function authorizeConsultationWrite(
  appointmentId: number,
  consultationId: number,
): Promise<{ consultation: AuthorizedConsultation } | { error: ActionError }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false) };
  }

  if (!Number.isInteger(appointmentId) || appointmentId <= 0 || !Number.isInteger(consultationId) || consultationId <= 0) {
    return { error: makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid appointment or consultation', ClinicalErrorCategory.VALIDATION, false, false) };
  }

  const [doctor, appointment, consultation] = await Promise.all([
    db.doctor.findUnique({ where: { user_id: user.userId }, select: { id: true } }),
    db.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, doctor_id: true } }),
    db.consultation.findUnique({
      where: { appointment_id: appointmentId },
      select: { id: true, doctor_id: true, appointment_id: true, completed_at: true },
    }),
  ]);

  if (!appointment) {
    return { error: makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false) };
  }

  if (!consultation) {
    return { error: makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false) };
  }

  if (consultation.id !== consultationId || consultation.appointment_id !== appointmentId) {
    return { error: makeError(ClinicalErrorCode.VALIDATION_ERROR, 'Consultation does not match this appointment', ClinicalErrorCategory.VALIDATION, false, false) };
  }

  const isAdmin = user.role === Role.ADMIN;
  const ownsAppointment = doctor?.id === appointment.doctor_id && doctor?.id === consultation.doctor_id;
  if (!isAdmin && !ownsAppointment) {
    return { error: makeError(ClinicalErrorCode.UNAUTHORIZED, 'Not authorized for this consultation', ClinicalErrorCategory.AUTHORIZATION, true, false) };
  }

  return { consultation };
}

export async function saveDraft(
  appointmentId: number,
  consultationId: number,
  notes: ClinicalNoteFields,
  outcomeType?: string,
  patientDecision?: string | null,
): Promise<ActionResult<any>> {
  try {
    const authorized = await authorizeConsultationWrite(appointmentId, consultationId);
    if ('error' in authorized) return authorized.error;

    if (authorized.consultation.completed_at) {
      return makeError(ClinicalErrorCode.CONSULTATION_COMPLETED, 'Consultation is already completed', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    const now = new Date();
    const doctorNotes = [notes.chiefComplaint, notes.examination, notes.assessment, notes.plan].filter(Boolean).join('\n\n') || null;
    const updated = await db.consultation.updateMany({
      where: {
        id: consultationId,
        appointment_id: appointmentId,
        completed_at: null,
      },
      data: {
        doctor_notes: doctorNotes,
        chief_complaint: notes.chiefComplaint ?? null,
        examination: notes.examination ?? null,
        assessment: notes.assessment ?? null,
        plan: notes.plan ?? null,
        outcome_type: outcomeType,
        patient_decision: patientDecision,
        last_activity_at: now,
        updated_at: now,
      },
    });

    if (updated.count !== 1) {
      return makeError(ClinicalErrorCode.CONSULTATION_COMPLETED, 'Consultation is already completed', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    return {
      success: true,
      data: {
        version: now.toISOString(),
        updatedAt: now,
        consultationId,
      },
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to save draft', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function saveCompletedNotes(
  appointmentId: number,
  consultationId: number,
  notes: ClinicalNoteFields,
): Promise<ActionResult<any>> {
  try {
    const authorized = await authorizeConsultationWrite(appointmentId, consultationId);
    if ('error' in authorized) return authorized.error;

    if (!authorized.consultation.completed_at) {
      return makeError(ClinicalErrorCode.VALIDATION_ERROR, 'Consultation is not completed', ClinicalErrorCategory.VALIDATION, false, false);
    }

    const now = new Date();
    const updated = await db.consultation.updateMany({
      where: {
        id: consultationId,
        appointment_id: appointmentId,
        completed_at: { not: null },
      },
      data: {
        chief_complaint: notes.chiefComplaint,
        examination: notes.examination,
        assessment: notes.assessment,
        plan: notes.plan,
        last_activity_at: now,
        updated_at: now,
      },
    });

    if (updated.count !== 1) {
      return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    return {
      success: true,
      data: {
        version: now.toISOString(),
        updatedAt: now,
        consultationId,
      },
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to save completed notes', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function refreshPatient(patientId: string): Promise<ActionResult<RefreshPatientResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
    }

    const accessToken = await getServerAccessToken();
    const result = await refreshPatientSession({ appointmentId: 0, user: { id: user.userId, email: user.email, role: user.role }, accessToken }, patientId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to refresh patient', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function getConsultationServiceId(): Promise<ActionResult<{ serviceId: number }>> {
  try {
    const serviceId = await resolveConsultationServiceId();
    return { success: true, data: { serviceId } };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to resolve consultation service', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function refreshVitals(patientId: string, consultationId: number): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ClinicalErrorCategory.SYSTEM, true, true);
}
