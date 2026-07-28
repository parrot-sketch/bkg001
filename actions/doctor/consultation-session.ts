'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import { createConsultationSession, startConsultationSession, type StartSessionResult, resumeConsultationSession, type ResumeSessionResult, completeConsultationSession, type CompleteSessionResult, refreshPatientSession, type RefreshPatientResult, switchPatientSession } from '@/infrastructure/factories/ConsultationSessionFactory';
import { ClinicalErrorCode, ClinicalErrorCategory } from '@/shared-kernel/errors/codes';
import { resolveConsultationServiceId } from '@/application/services/billing/resolveConsultationServiceId';
import db from '@/lib/db';
import { Prisma } from '@prisma/client';
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
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to start consultation', ClinicalErrorCategory.SYSTEM, true, true, error);
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

export async function saveDraft(consultationId: number, doctorId: string, notes: { chiefComplaint?: string; examination?: string; assessment?: string; plan?: string }, outcomeType?: string, patientDecision?: string | null): Promise<ActionResult<any>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    if (consultationId <= 0) {
      return makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid consultation ID', ClinicalErrorCategory.VALIDATION, false, false);
    }

    let consultation = await db.consultation.findFirst({
      where: {
        OR: [
          { id: consultationId },
          { appointment_id: consultationId },
        ],
      },
      select: { id: true, doctor_id: true, appointment_id: true },
    });

    const now = new Date();
    const doctorNotes = [notes.chiefComplaint, notes.examination, notes.assessment, notes.plan].filter(Boolean).join('\n\n') || null;

    if (!consultation) {
      // Find appointment by consultationId (treating it as appointmentId)
      const appointment = await db.appointment.findUnique({
        where: { id: consultationId },
        select: { id: true, doctor_id: true, status: true },
      });

      if (!appointment) {
        return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation and appointment not found', ClinicalErrorCategory.CONSULTATION, false, false);
      }

      const assignedDoctorId = doctorId || appointment.doctor_id;

      // Auto-create consultation record for appointment
      const created = await db.consultation.create({
        data: {
          appointment_id: appointment.id,
          doctor_id: assignedDoctorId,
          user_id: user.userId,
          started_at: now,
          doctor_notes: doctorNotes,
          chief_complaint: notes.chiefComplaint ?? null,
          examination: notes.examination ?? null,
          assessment: notes.assessment ?? null,
          plan: notes.plan ?? null,
          outcome_type: outcomeType ?? null,
          patient_decision: patientDecision ?? null,
          last_activity_at: now,
        },
      });

      // Ensure appointment status is updated if checked-in or ready
      if (['CHECKED_IN', 'READY_FOR_CONSULTATION'].includes(appointment.status)) {
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'IN_CONSULTATION',
            consultation_started_at: now,
          },
        });
      }

      return {
        success: true,
        data: {
          version: created.updated_at.toISOString(),
          updatedAt: created.updated_at,
          consultationId: created.id,
        },
      };
    }

    if (doctorId && consultation.doctor_id !== doctorId && user.role !== 'ADMIN') {
      const doctorRecord = await db.doctor.findFirst({
        where: { id: consultation.doctor_id },
        select: { user_id: true },
      });
      if (!doctorRecord || doctorRecord.user_id !== user.userId) {
        return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Not authorized for this consultation', ClinicalErrorCategory.AUTHORIZATION, true, false);
      }
    }

    const updated = await db.consultation.update({
      where: { id: consultation.id },
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

    return {
      success: true,
      data: {
        version: updated.updated_at.toISOString(),
        updatedAt: updated.updated_at,
        consultationId: updated.id,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false);
      }
    }
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to save draft', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function saveCompletedNotes(consultationId: number, doctorId: string, notes: { chiefComplaint?: string; examination?: string; assessment?: string; plan?: string }): Promise<ActionResult<any>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    if (consultationId <= 0) {
      return makeError(ClinicalErrorCode.INVALID_INPUT, 'Invalid consultation ID', ClinicalErrorCategory.VALIDATION, false, false);
    }

    let consultation = await db.consultation.findFirst({
      where: {
        OR: [
          { id: consultationId },
          { appointment_id: consultationId },
        ],
      },
      select: { id: true, doctor_id: true },
    });

    if (!consultation) {
      return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    if (doctorId && consultation.doctor_id !== doctorId && user.role !== 'ADMIN') {
      const doctorRecord = await db.doctor.findFirst({
        where: { id: consultation.doctor_id },
        select: { user_id: true },
      });
      if (!doctorRecord || doctorRecord.user_id !== user.userId) {
        return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Not authorized for this consultation', ClinicalErrorCategory.AUTHORIZATION, true, false);
      }
    }

    const now = new Date();
    const updated = await db.consultation.update({
      where: { id: consultation.id },
      data: {
        chief_complaint: notes.chiefComplaint,
        examination: notes.examination,
        assessment: notes.assessment,
        plan: notes.plan,
        last_activity_at: now,
        updated_at: now,
      },
    });

    return {
      success: true,
      data: {
        version: updated.updated_at.toISOString(),
        updatedAt: updated.updated_at,
        consultationId: updated.id,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false);
      }
    }
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
