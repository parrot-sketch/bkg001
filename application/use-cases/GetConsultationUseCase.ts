import { IConsultationRepository } from '../../domain/interfaces/repositories/IConsultationRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { ConsultationResponseDto } from '../dtos/ConsultationResponseDto';
import { ConsultationMapper as ApplicationConsultationMapper } from '../mappers/ConsultationMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import db from '@/lib/db';

/**
 * Use Case: GetConsultationUseCase
 * 
 * Retrieves consultation details by appointment ID.
 * 
 * Business Purpose:
 * - Get consultation for active session UI
 * - Validate doctor has access to consultation
 * - Include aesthetic surgery context (photos, case plans)
 * 
 * Clinical Workflow:
 * This use case supports the consultation session UI:
 * - Doctor viewing active consultation
 * - Loading consultation state for session management
 * - Displaying consultation history
 * 
 * Business Rules:
 * - Appointment must exist
 * - Doctor ID must match appointment's doctor (RBAC)
 * - Consultation may not exist yet (returns null)
 * - Must include photo counts and case plan status
 * 
 * Aesthetic Surgery Considerations:
 * - Photo tracking is critical (before/after documentation)
 * - Case plan linkage important for surgical workflow
 * - Marketing consent tracking for legal compliance
 */
export class GetConsultationUseCase {
  constructor(
    private readonly consultationRepository: IConsultationRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {
    if (!consultationRepository) {
      throw new Error('ConsultationRepository is required');
    }
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
  }

  /**
   * Executes the get consultation use case
   * 
   * @param appointmentId - Appointment ID to find consultation for
   * @param doctorId - Doctor ID for RBAC validation
   * @returns Promise resolving to ConsultationResponseDto or null if consultation doesn't exist
   * @throws DomainException if appointment not found or doctor doesn't have access
   */
  async execute(appointmentId: number, doctorId: string): Promise<ConsultationResponseDto | null> {
    // Step 1: Find appointment (validates appointment exists)
    const appointment = await this.appointmentRepository.findById(appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${appointmentId} not found`, {
        appointmentId,
      });
    }

    // Step 2: Validate doctor ID matches appointment (RBAC)
    if (appointment.getDoctorId() !== doctorId) {
      throw new DomainException(
        `Doctor ${doctorId} does not have access to appointment ${appointmentId}`,
        {
          appointmentId,
          doctorId,
          assignedDoctorId: appointment.getDoctorId(),
        },
      );
    }

    // Step 3: Find consultation (may not exist yet)
    const consultation = await this.consultationRepository.findByAppointmentId(appointmentId);

    if (!consultation) {
      // Consultation doesn't exist yet - this is valid (not started)
      return null;
    }

    // Step 4: Get aesthetic surgery context (photos, case plans)
    const [photoCount, marketingConsentPhotos, casePlan] = await Promise.all([
      // Count photos for this appointment
      (db as any).patientImage.count({
        where: { appointment_id: appointmentId },
      }),

      // Check for marketing consent photos
      (db as any).patientImage.count({
        where: {
          appointment_id: appointmentId,
          consent_for_marketing: true,
        },
      }),

      // Find case plan if exists
      (db as any).casePlan.findFirst({
        where: { appointment_id: appointmentId },
        select: { id: true },
      }),
    ]);

    // Step 5: Map to response DTO
    return ApplicationConsultationMapper.toResponseDto(consultation, {
      photoCount,
      hasMarketingConsentPhotos: marketingConsentPhotos > 0,
      hasCasePlan: !!casePlan,
      casePlanId: casePlan?.id,
    });
  }
}
