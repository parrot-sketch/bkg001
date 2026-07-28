'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { ClinicalErrorCode, ClinicalErrorCategory } from '@/shared-kernel/errors/codes';

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|li|h[1-6]|environment_details|summary)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPlainText(html: string): string {
  return stripHtml(html);
}

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

export interface ConsultationHistoryItem {
  readonly id: number;
  readonly appointmentId: number;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly state: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly durationMinutes?: number;
  readonly outcomeType?: string;
  readonly patientDecision?: string;
  readonly notesSummary?: string;
  readonly notes?: {
    readonly chiefComplaint?: string;
    readonly examination?: string;
    readonly assessment?: string;
    readonly plan?: string;
    readonly fullText?: string;
  };
  readonly doctor: {
    readonly id: string;
    readonly name: string;
    readonly specialization: string;
  };
}

export interface ConsultationHistoryResponse {
  readonly patientId: string;
  readonly totalCount: number;
  readonly consultations: ConsultationHistoryItem[];
}

export interface PreviousConsultationNotes {
  readonly appointmentId: number;
  readonly consultationId: number;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly state: string;
  readonly notes: {
    readonly fullText: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: string;
  readonly patientDecision?: string;
}

export async function getPatientConsultationHistory(patientId: string): Promise<ActionResult<ConsultationHistoryResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const appointments = await db.appointment.findMany({
      where: {
        patient_id: patientId,
        doctor: {
          user_id: user.userId,
        },
      },
      orderBy: {
        appointment_date: 'desc',
      },
    });

    const consultationPromises = appointments.map((apt) =>
      db.consultation.findFirst({
        where: {
          appointment_id: apt.id,
        },
      })
    );

    const consultations = await Promise.all(consultationPromises);
    const consultationAppointmentPairs = consultations
      .map((consultation, index) => ({
        consultation,
        appointment: appointments[index],
      }))
      .filter((pair) => pair.consultation !== null) as Array<{
      consultation: any;
      appointment: any;
    }>;

    const result: ConsultationHistoryItem[] = consultationAppointmentPairs.map(({ consultation, appointment }) => {
      const chiefComplaint = consultation.chief_complaint || '';
      const examination = consultation.examination || '';
      const assessment = consultation.assessment || '';
      const plan = consultation.plan || '';
      const doctorNotes = consultation.doctor_notes || '';

      const parts = [chiefComplaint, examination, assessment, plan].filter(Boolean);
      const fullText = parts.length > 0 ? parts.join('\n\n') : doctorNotes;
      const plainText = toPlainText(fullText);
      const notesSummary = plainText.length > 200 ? plainText.substring(0, 200) + '…' : plainText;

      return {
        id: consultation.id,
        appointmentId: appointment.id,
        appointmentDate: appointment.appointment_date.toISOString(),
        appointmentTime: appointment.time || '',
        state: consultation.state,
        startedAt: consultation.started_at?.toISOString(),
        completedAt: consultation.completed_at?.toISOString(),
        durationMinutes: consultation.duration_minutes || undefined,
        outcomeType: consultation.outcome_type || undefined,
        patientDecision: consultation.patient_decision || undefined,
        notesSummary: notesSummary || undefined,
        notes: {
          chiefComplaint: chiefComplaint || undefined,
          examination: examination || undefined,
          assessment: assessment || undefined,
          plan: plan || undefined,
          fullText: fullText || undefined,
        },
        doctor: {
          id: appointment.doctor_id,
          name: 'Doctor',
          specialization: '',
        },
      };
    });

    return {
      success: true,
      data: {
        patientId,
        totalCount: result.length,
        consultations: result,
      },
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to load consultation history', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}

export async function loadPreviousConsultationNotes(appointmentId: number): Promise<ActionResult<PreviousConsultationNotes>> {
  const user = await getCurrentUser();
  if (!user) {
    return makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTHORIZATION, true, false);
  }

  try {
    const appointment = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        doctor: {
          user_id: user.userId,
        },
      },
      include: {
        patient: true,
      },
    });

    if (!appointment) {
      return makeError(ClinicalErrorCode.APPOINTMENT_NOT_FOUND, 'Appointment not found', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    const consultation = await db.consultation.findFirst({
      where: {
        appointment_id: appointmentId,
      },
    });

    if (!consultation) {
      return makeError(ClinicalErrorCode.SESSION_NOT_FOUND, 'Consultation not found', ClinicalErrorCategory.CONSULTATION, false, false);
    }

    const chiefComplaint = consultation.chief_complaint || '';
    const examination = consultation.examination || '';
    const assessment = consultation.assessment || '';
    const plan = consultation.plan || '';
    const doctorNotes = consultation.doctor_notes || '';

    const parts = [chiefComplaint, examination, assessment, plan].filter(Boolean);
    const fullText = parts.length > 0 ? parts.join('\n\n') : doctorNotes;

    const structured = {
      chiefComplaint: chiefComplaint || undefined,
      examination: examination || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
    };

    const hasStructured = parts.length > 0;

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        consultationId: consultation.id,
        appointmentDate: appointment.appointment_date.toISOString(),
        appointmentTime: appointment.time || '',
        state: consultation.state,
        notes: {
          fullText,
          structured: hasStructured ? structured : undefined,
        },
        outcomeType: consultation.outcome_type || undefined,
        patientDecision: consultation.patient_decision || undefined,
      },
    };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to load previous consultation', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}
