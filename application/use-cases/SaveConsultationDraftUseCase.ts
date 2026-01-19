import { IConsultationRepository } from '../../domain/interfaces/repositories/IConsultationRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ConsultationState } from '../../domain/enums/ConsultationState';
import { ConsultationNotes } from '../../domain/value-objects/ConsultationNotes';
import { SaveConsultationDraftDto } from '../dtos/SaveConsultationDraftDto';
import { ConsultationResponseDto } from '../dtos/ConsultationResponseDto';
import { ConsultationMapper as ApplicationConsultationMapper } from '../mappers/ConsultationMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import db from '@/lib/db';

/**
 * Use Case: SaveConsultationDraftUseCase
 * 
 * Saves draft consultation notes during an active consultation session.
 * 
 * Business Purpose:
 * - Auto-save draft notes during consultation
 * - Prevent data loss during session
 * - Support version safety (optimistic locking)
 * - Maintain audit trail for medico-legal compliance
 * 
 * Clinical Workflow:
 * This use case supports the consultation session UI:
 * - Auto-save every 30 seconds
 * - Manual save on blur/exit
 * - Draft recovery on page reload
 * 
 * Business Rules:
 * - Appointment must exist
 * - Doctor ID must match appointment's doctor
 * - Consultation must be IN_PROGRESS (cannot save draft if not started or completed)
 * - Version token validation (if provided) prevents overwriting newer versions
 * - Audit trail required for all draft saves
 * 
 * Aesthetic Surgery Considerations:
 * - Draft notes are legally sensitive → must support version safety
 * - Audit-friendly structure (timestamped, user-tracked)
 * - Future extensibility (structured fields: patient goals, examination, etc.)
 * - Notes may include procedure discussion, recommendations, treatment plans
 */
export class SaveConsultationDraftUseCase {
  constructor(
    private readonly consultationRepository: IConsultationRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly auditService: IAuditService,
  ) {
    if (!consultationRepository) {
      throw new Error('ConsultationRepository is required');
    }
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the save consultation draft use case
   * 
   * @param dto - SaveConsultationDraftDto with appointment ID, doctor ID, and notes
   * @returns Promise resolving to ConsultationResponseDto with updated consultation
   * @throws DomainException if validation fails or version conflict
   */
  async execute(dto: SaveConsultationDraftDto): Promise<ConsultationResponseDto> {
    // Step 1: Find appointment (validates appointment exists)
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate doctor ID matches appointment (RBAC)
    if (appointment.getDoctorId() !== dto.doctorId) {
      throw new DomainException(
        `Doctor ${dto.doctorId} does not have access to appointment ${dto.appointmentId}`,
        {
          appointmentId: dto.appointmentId,
          doctorId: dto.doctorId,
          assignedDoctorId: appointment.getDoctorId(),
        },
      );
    }

    // Step 3: Find consultation (must exist and be IN_PROGRESS)
    let consultation = await this.consultationRepository.findByAppointmentId(dto.appointmentId);

    if (!consultation) {
      throw new DomainException(
        `Consultation for appointment ${dto.appointmentId} does not exist. Consultation must be started before saving drafts.`,
        {
          appointmentId: dto.appointmentId,
        },
      );
    }

    // Step 4: Validate consultation state (must be IN_PROGRESS)
    if (consultation.getState() !== ConsultationState.IN_PROGRESS) {
      throw new DomainException(
        `Cannot save draft for consultation in ${consultation.getState()} state. Only IN_PROGRESS consultations can be updated.`,
        {
          appointmentId: dto.appointmentId,
          currentState: consultation.getState(),
        },
      );
    }

    // Step 5: Version token validation (optimistic locking)
    if (dto.versionToken) {
      const currentUpdatedAt = consultation.getUpdatedAt().toISOString();
      if (dto.versionToken !== currentUpdatedAt) {
        throw new DomainException(
          'Consultation has been updated by another session. Please refresh and try again.',
          {
            appointmentId: dto.appointmentId,
            providedVersion: dto.versionToken,
            currentVersion: currentUpdatedAt,
          },
        );
      }
    }

    // Step 6: Map notes DTO to ConsultationNotes value object
    let notes: ConsultationNotes;
    if (dto.notes.structured) {
      notes = ConsultationNotes.createStructured({
        chiefComplaint: dto.notes.structured.chiefComplaint,
        examination: dto.notes.structured.examination,
        assessment: dto.notes.structured.assessment,
        plan: dto.notes.structured.plan,
      });
    } else if (dto.notes.rawText) {
      notes = ConsultationNotes.createRaw(dto.notes.rawText);
    } else {
      throw new DomainException('Notes are required', {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 7: Update consultation with new notes
    const updatedConsultation = consultation.updateNotes(notes);

    // Step 8: Save updated consultation
    await this.consultationRepository.update(updatedConsultation);

    // Step 9: Record audit event (medico-legal compliance)
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: updatedConsultation.getId().toString(),
      action: 'UPDATE',
      model: 'Consultation',
      details: `Draft notes saved for consultation ${updatedConsultation.getId()} (appointment ${dto.appointmentId})`,
    });

    // Step 10: Get aesthetic surgery context (photos, case plans)
    const [photoCount, marketingConsentPhotos, casePlan] = await Promise.all([
      (db as any).patientImage.count({
        where: { appointment_id: dto.appointmentId },
      }),
      (db as any).patientImage.count({
        where: {
          appointment_id: dto.appointmentId,
          consent_for_marketing: true,
        },
      }),
      (db as any).casePlan.findFirst({
        where: { appointment_id: dto.appointmentId },
        select: { id: true },
      }),
    ]);

    // Step 11: Map to response DTO
    return ApplicationConsultationMapper.toResponseDto(updatedConsultation, {
      photoCount,
      hasMarketingConsentPhotos: marketingConsentPhotos > 0,
      hasCasePlan: !!casePlan,
      casePlanId: casePlan?.id,
    });
  }
}
