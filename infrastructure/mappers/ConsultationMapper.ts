import { Consultation } from '../../domain/entities/Consultation';
import { ConsultationState } from '../../domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../domain/enums/PatientDecision';
import { ConsultationNotes } from '../../domain/value-objects/ConsultationNotes';
import { ConsultationDuration } from '../../domain/value-objects/ConsultationDuration';
import { Prisma, Consultation as PrismaConsultation } from '@prisma/client';

/**
 * Mapper: ConsultationMapper
 * 
 * Maps between Prisma Consultation model and domain Consultation entity.
 * This mapper handles the translation between infrastructure (Prisma) and domain layers.
 * 
 * Responsibilities:
 * - Convert Prisma snake_case to domain camelCase
 * - Convert Prisma enums to domain enums
 * - Handle optional fields and null values
 * - Map value objects (ConsultationNotes, ConsultationDuration)
 * - No business logic - only data translation
 */
export class ConsultationMapper {
  /**
   * Maps a Prisma Consultation model to a domain Consultation entity
   * 
   * @param prismaConsultation - Prisma Consultation model from database
   * @returns Domain Consultation entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaConsultation: PrismaConsultation & {
    outcome_type?: string | null;
    patient_decision?: string | null;
    duration_minutes?: number | null;
    duration_seconds?: number | null;
  }): Consultation {
    // Map state - if not in schema yet, infer from started_at and completed_at
    const state = this.inferState(prismaConsultation);

    // Map duration
    const duration = this.mapDuration(prismaConsultation);

    // Map notes
    const notes = this.mapNotes(prismaConsultation);

    // Map outcome type
    const outcomeType = prismaConsultation.outcome_type
      ? (prismaConsultation.outcome_type as ConsultationOutcomeType)
      : undefined;

    // Map patient decision
    const patientDecision = prismaConsultation.patient_decision
      ? (prismaConsultation.patient_decision as PatientDecision)
      : undefined;

    // Create consultation entity
    const consultation = Consultation.create({
      id: prismaConsultation.id,
      appointmentId: prismaConsultation.appointment_id,
      doctorId: prismaConsultation.doctor_id,
      userId: prismaConsultation.user_id ?? undefined,
      createdAt: prismaConsultation.created_at,
      updatedAt: prismaConsultation.updated_at,
    });

    // Apply state transitions based on current state
    let result = consultation;

    // If started, apply start transition
    if (state === ConsultationState.IN_PROGRESS || state === ConsultationState.COMPLETED) {
      if (prismaConsultation.started_at && prismaConsultation.user_id) {
        result = result.start(prismaConsultation.user_id, prismaConsultation.started_at);
      }
    }

    // If notes exist, update them
    if (notes && !notes.isEmpty()) {
      result = result.updateNotes(notes);
    }

    // If completed, apply complete transition
    if (state === ConsultationState.COMPLETED) {
      if (!outcomeType) {
        throw new Error('Completed consultation must have outcome type');
      }
      result = result.complete({
        outcomeType,
        notes: notes ?? ConsultationNotes.createEmpty(),
        patientDecision,
        followUpDate: prismaConsultation.follow_up_date ?? undefined,
        followUpType: prismaConsultation.follow_up_type ?? undefined,
        followUpNotes: prismaConsultation.follow_up_notes ?? undefined,
        completedAt: prismaConsultation.completed_at ?? undefined,
      });
    }

    return result;
  }

  /**
   * Maps a domain Consultation entity to Prisma ConsultationCreateInput for creation
   * 
   * Note: Some fields (state, chief_complaint, etc.) may not exist in Prisma schema yet.
   * These are included for future compatibility.
   * 
   * @param consultation - Domain Consultation entity
   * @returns Prisma ConsultationCreateInput for creating a new consultation
   */
  static toPrismaCreateInput(consultation: Consultation): Prisma.ConsultationCreateInput {
    const notes = consultation.getNotes();
    const duration = consultation.getDuration();

    const input: any = {
      appointment: {
        connect: { id: consultation.getAppointmentId() },
      },
      doctor: {
        connect: { id: consultation.getDoctorId() },
      },
      user_id: consultation.getUserId() ?? null,
      started_at: consultation.getStartedAt() ?? null,
      completed_at: consultation.getCompletedAt() ?? null,
      duration_minutes: duration?.getMinutes() ?? null,
      doctor_notes: notes?.toFullText() ?? null,
      outcome_type: consultation.getOutcomeType() ?? null,
      patient_decision: consultation.getPatientDecision() ?? null,
      follow_up_date: consultation.getFollowUpDate() ?? null,
      follow_up_type: consultation.getFollowUpType() ?? null,
      follow_up_notes: consultation.getFollowUpNotes() ?? null,
    };

    // Add fields that may not exist in schema yet (for future compatibility)
    if ((Prisma as any).ConsultationCreateInput?.state !== undefined) {
      input.state = consultation.getState();
    }
    if ((Prisma as any).ConsultationCreateInput?.duration_seconds !== undefined) {
      input.duration_seconds = duration?.getSeconds() ?? null;
    }
    if ((Prisma as any).ConsultationCreateInput?.chief_complaint !== undefined) {
      input.chief_complaint = notes?.getChiefComplaint() ?? null;
    }
    if ((Prisma as any).ConsultationCreateInput?.examination !== undefined) {
      input.examination = notes?.getExamination() ?? null;
    }
    if ((Prisma as any).ConsultationCreateInput?.assessment !== undefined) {
      input.assessment = notes?.getAssessment() ?? null;
    }
    if ((Prisma as any).ConsultationCreateInput?.plan !== undefined) {
      input.plan = notes?.getPlan() ?? null;
    }

    return input;
  }

  /**
   * Maps a domain Consultation entity to Prisma ConsultationUpdateInput for updates
   * 
   * Note: Some fields (state, chief_complaint, etc.) may not exist in Prisma schema yet.
   * These are included for future compatibility.
   * 
   * @param consultation - Domain Consultation entity with updated values
   * @returns Prisma ConsultationUpdateInput for updating an existing consultation
   */
  static toPrismaUpdateInput(consultation: Consultation): Prisma.ConsultationUpdateInput {
    const notes = consultation.getNotes();
    const duration = consultation.getDuration();

    const updateInput: any = {
      started_at: consultation.getStartedAt() ?? null,
      completed_at: consultation.getCompletedAt() ?? null,
      duration_minutes: duration?.getMinutes() ?? null,
      doctor_notes: notes?.toFullText() ?? null,
      outcome_type: consultation.getOutcomeType() ?? null,
      patient_decision: consultation.getPatientDecision() ?? null,
      follow_up_date: consultation.getFollowUpDate() ?? null,
      follow_up_type: consultation.getFollowUpType() ?? null,
      follow_up_notes: consultation.getFollowUpNotes() ?? null,
    };

    // Only update user_id if it's set
    if (consultation.getUserId() !== undefined) {
      updateInput.user_id = consultation.getUserId() ?? null;
    }

    // Add fields that may not exist in schema yet (for future compatibility)
    if ((Prisma as any).ConsultationUpdateInput?.state !== undefined) {
      updateInput.state = consultation.getState();
    }
    if ((Prisma as any).ConsultationUpdateInput?.duration_seconds !== undefined) {
      updateInput.duration_seconds = duration?.getSeconds() ?? null;
    }
    if ((Prisma as any).ConsultationUpdateInput?.chief_complaint !== undefined) {
      updateInput.chief_complaint = notes?.getChiefComplaint() ?? null;
    }
    if ((Prisma as any).ConsultationUpdateInput?.examination !== undefined) {
      updateInput.examination = notes?.getExamination() ?? null;
    }
    if ((Prisma as any).ConsultationUpdateInput?.assessment !== undefined) {
      updateInput.assessment = notes?.getAssessment() ?? null;
    }
    if ((Prisma as any).ConsultationUpdateInput?.plan !== undefined) {
      updateInput.plan = notes?.getPlan() ?? null;
    }

    return updateInput;
  }

  /**
   * Infers consultation state from Prisma model
   * TODO: Once state field is added to Prisma schema, use that directly
   */
  private static inferState(prismaConsultation: PrismaConsultation): ConsultationState {
    // If completed_at exists, consultation is completed
    if (prismaConsultation.completed_at) {
      return ConsultationState.COMPLETED;
    }
    // If started_at exists, consultation is in progress
    if (prismaConsultation.started_at) {
      return ConsultationState.IN_PROGRESS;
    }
    // Otherwise, not started
    return ConsultationState.NOT_STARTED;
  }

  /**
   * Maps duration from Prisma model to ConsultationDuration value object
   */
  private static mapDuration(
    prismaConsultation: PrismaConsultation & {
      duration_minutes?: number | null;
      duration_seconds?: number | null;
    }
  ): ConsultationDuration | undefined {
    if (prismaConsultation.duration_minutes !== null && prismaConsultation.duration_minutes !== undefined) {
      // If we have duration_minutes and duration_seconds, use both
      if (prismaConsultation.duration_seconds !== null && prismaConsultation.duration_seconds !== undefined) {
        return ConsultationDuration.fromSeconds(
          prismaConsultation.duration_minutes * 60 + prismaConsultation.duration_seconds
        );
      }
      // Otherwise, just use minutes
      return ConsultationDuration.fromMinutes(prismaConsultation.duration_minutes);
    }
    // If we have started_at and completed_at, calculate duration
    if (prismaConsultation.started_at && prismaConsultation.completed_at) {
      return ConsultationDuration.calculate(
        prismaConsultation.started_at,
        prismaConsultation.completed_at
      );
    }
    return undefined;
  }

  /**
   * Maps notes from Prisma model to ConsultationNotes value object
   */
  private static mapNotes(prismaConsultation: PrismaConsultation): ConsultationNotes | undefined {
    // Try structured notes first (if fields exist in schema)
    const chiefComplaint = (prismaConsultation as any).chief_complaint;
    const examination = (prismaConsultation as any).examination;
    const assessment = (prismaConsultation as any).assessment;
    const plan = (prismaConsultation as any).plan;

    if (chiefComplaint || examination || assessment || plan) {
      return ConsultationNotes.createStructured({
        chiefComplaint,
        examination,
        assessment,
        plan,
      });
    }

    // Fall back to raw text
    if (prismaConsultation.doctor_notes) {
      return ConsultationNotes.createRaw(prismaConsultation.doctor_notes);
    }

    return undefined;
  }
}
