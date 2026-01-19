import { Consultation } from '../../domain/entities/Consultation';
import { ConsultationResponseDto } from '../dtos/ConsultationResponseDto';

/**
 * Mapper: ConsultationMapper (Application Layer)
 * 
 * Maps between Consultation domain entities and application DTOs.
 * This mapper handles translation between domain layer and application layer.
 * 
 * Responsibilities:
 * - Convert domain entities to response DTOs
 * - Handle aesthetic surgery context (photos, case plans)
 * - No business logic - only data transformation
 */
export class ConsultationMapper {
  /**
   * Maps a Consultation domain entity to a ConsultationResponseDto
   * 
   * @param consultation - Consultation domain entity
   * @param context - Optional aesthetic surgery context (photos, case plans)
   * @returns ConsultationResponseDto with consultation data
   */
  static toResponseDto(
    consultation: Consultation,
    context?: {
      photoCount?: number;
      hasMarketingConsentPhotos?: boolean;
      hasCasePlan?: boolean;
      casePlanId?: number;
    }
  ): ConsultationResponseDto {
    const notes = consultation.getNotes();
    const duration = consultation.getDuration();

    const dto: ConsultationResponseDto = {
      id: consultation.getId(),
      appointmentId: consultation.getAppointmentId(),
      doctorId: consultation.getDoctorId(),
      userId: consultation.getUserId(),
      state: consultation.getState(),
      startedAt: consultation.getStartedAt(),
      completedAt: consultation.getCompletedAt(),
      durationMinutes: duration?.getMinutes(),
      notes: notes
        ? {
            fullText: notes.toFullText(),
            structured: notes.isStructured()
              ? {
                  chiefComplaint: notes.getChiefComplaint(),
                  examination: notes.getExamination(),
                  assessment: notes.getAssessment(),
                  plan: notes.getPlan(),
                }
              : undefined,
          }
        : undefined,
      outcomeType: consultation.getOutcomeType(),
      patientDecision: consultation.getPatientDecision(),
      followUp:
        consultation.getFollowUpDate() ||
        consultation.getFollowUpType() ||
        consultation.getFollowUpNotes()
          ? {
              date: consultation.getFollowUpDate(),
              type: consultation.getFollowUpType(),
              notes: consultation.getFollowUpNotes(),
            }
          : undefined,
      createdAt: consultation.getCreatedAt(),
      updatedAt: consultation.getUpdatedAt(),
      // Aesthetic surgery context
      photoCount: context?.photoCount,
      hasMarketingConsentPhotos: context?.hasMarketingConsentPhotos,
      hasCasePlan: context?.hasCasePlan,
      casePlanId: context?.casePlanId,
    };

    return dto;
  }
}
