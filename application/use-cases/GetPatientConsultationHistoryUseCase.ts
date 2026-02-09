import { IConsultationRepository } from '../../domain/interfaces/repositories/IConsultationRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { ConsultationState } from '../../domain/enums/ConsultationState';
import { PatientConsultationHistoryDto, PatientConsultationHistoryItemDto } from '../dtos/PatientConsultationHistoryDto';
import { ConsultationMapper as ApplicationConsultationMapper } from '../mappers/ConsultationMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import db from '@/lib/db';
import { PatientDecision } from '../../domain/enums/PatientDecision';

/**
 * Use Case: GetPatientConsultationHistoryUseCase
 * 
 * Retrieves consultation history for a patient, optimized for aesthetic surgery workflows.
 * 
 * Business Purpose:
 * - Display patient consultation timeline
 * - Support quick doctor scanning during new consultations
 * - Track patient journey (decisions, photos, case plans)
 * - Show progression over time (not one-off visits)
 * 
 * Clinical Workflow:
 * This use case supports:
 * - Doctor reviewing patient history before consultation
 * - Understanding patient journey (previous procedures, decisions)
 * - Photo progression tracking (before/after)
 * - Decision timeline (proceeded, declined, undecided)
 * 
 * Business Rules:
 * - Patient must exist
 * - Returns all consultations for patient (chronological)
 * - Includes aesthetic surgery context (photos, case plans, decisions)
 * 
 * Aesthetic Surgery Considerations:
 * - Timeline-based UI (chronological display)
 * - Fast doctor scanning (key decisions visible)
 * - Photo tracking (before/after progression)
 * - Decision status (proceeded, declined, undecided)
 * - Case plan linkage (surgical planning workflow)
 */
export class GetPatientConsultationHistoryUseCase {
  constructor(
    private readonly consultationRepository: IConsultationRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {
    if (!consultationRepository) {
      throw new Error('ConsultationRepository is required');
    }
    if (!patientRepository) {
      throw new Error('PatientRepository is required');
    }
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
  }

  /**
   * Executes the get patient consultation history use case
   * 
   * @param patientId - Patient ID to get consultation history for
   * @returns Promise resolving to PatientConsultationHistoryDto
   * @throws DomainException if patient not found
   */
  async execute(patientId: string): Promise<PatientConsultationHistoryDto> {
    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(patientId);

    if (!patient) {
      throw new DomainException(`Patient with ID ${patientId} not found`, {
        patientId,
      });
    }

    // Step 2: Get all appointments for patient
    const appointments = await this.appointmentRepository.findByPatient(patientId);

    // Step 3: Get consultations for each appointment (in parallel)
    const consultationPromises = appointments.map((apt) =>
      this.consultationRepository.findByAppointmentId(apt.getId())
    );
    const consultations = await Promise.all(consultationPromises);

    // Step 4: Filter out null consultations and pair with appointments
    const consultationAppointmentPairs = consultations
      .map((consultation, index) => ({
        consultation,
        appointment: appointments[index],
      }))
      .filter((pair) => pair.consultation !== null) as Array<{
      consultation: NonNullable<typeof consultations[0]>;
      appointment: typeof appointments[0];
    }>;

    // Step 5: Get aesthetic surgery context for all consultations (photos, case plans)
    const appointmentIds = consultationAppointmentPairs.map((pair) => pair.appointment.getId());

    const [allPhotos, allCasePlans, allDoctors] = await Promise.all([
      // Get all photos for these appointments
      (db as any).patientImage.findMany({
        where: { appointment_id: { in: appointmentIds } },
        select: {
          appointment_id: true,
          timepoint: true,
          consent_for_marketing: true,
        },
      }),

      // Get all case plans for these appointments
      (db as any).casePlan.findMany({
        where: { appointment_id: { in: appointmentIds } },
        select: {
          id: true,
          appointment_id: true,
        },
      }),

      // Get doctor information
      db.doctor.findMany({
        where: {
          id: {
            in: Array.from(
              new Set(consultationAppointmentPairs.map((pair) => pair.appointment.getDoctorId()))
            ),
          },
        },
        select: {
          id: true,
          name: true,
          specialization: true,
        },
      }),
    ]);

    // Step 6: Build lookup maps for efficient access
    type PhotoType = { appointment_id: number | null; timepoint: string; consent_for_marketing: boolean };
    type CasePlanType = { id: number; appointment_id: number };
    
    const photosByAppointment = new Map<number, PhotoType[]>();
    const beforePhotosByAppointment = new Map<number, number>();
    const afterPhotosByAppointment = new Map<number, number>();
    const casePlansByAppointment = new Map<number, CasePlanType>();
    const doctorsById = new Map<string, typeof allDoctors[0]>();

    (allPhotos as PhotoType[]).forEach((photo: PhotoType) => {
      if (!photosByAppointment.has(photo.appointment_id || 0)) {
        photosByAppointment.set(photo.appointment_id || 0, []);
      }
      photosByAppointment.get(photo.appointment_id || 0)!.push(photo);

      // Count before/after photos
      const aptId = photo.appointment_id || 0;
      if (photo.timepoint === 'PRE_CONSULTATION' || photo.timepoint === 'PRE_PROCEDURE') {
        beforePhotosByAppointment.set(aptId, (beforePhotosByAppointment.get(aptId) || 0) + 1);
      } else if (photo.timepoint === 'POST_PROCEDURE' || photo.timepoint === 'FOLLOW_UP') {
        afterPhotosByAppointment.set(aptId, (afterPhotosByAppointment.get(aptId) || 0) + 1);
      }
    });

    (allCasePlans as CasePlanType[]).forEach((casePlan: CasePlanType) => {
      casePlansByAppointment.set(casePlan.appointment_id, casePlan);
    });

    allDoctors.forEach((doctor) => {
      doctorsById.set(doctor.id, doctor);
    });

    // Step 7: Map to response DTO items
    const consultationItems: PatientConsultationHistoryItemDto[] = consultationAppointmentPairs
      .map(({ consultation, appointment }) => {
        const appointmentId = appointment.getId();
        const doctor = doctorsById.get(appointment.getDoctorId());
        const photos = photosByAppointment.get(appointmentId) || [];
        const casePlan = casePlansByAppointment.get(appointmentId);

        const notes = consultation.getNotes();
        const plainText = notes ? notes.toPlainText() : undefined;
        const notesSummary = plainText
          ? plainText.substring(0, 200) + (plainText.length > 200 ? '…' : '')
          : undefined;

        const patientDecision = consultation.getPatientDecision();
        const patientProceeded = patientDecision === PatientDecision.YES;

        return {
          id: consultation.getId(),
          appointmentId,
          appointmentDate: appointment.getAppointmentDate(),
          appointmentTime: appointment.getTime(),
          doctor: doctor
            ? {
                id: doctor.id,
                name: doctor.name,
                specialization: doctor.specialization,
              }
            : {
                id: appointment.getDoctorId(),
                name: 'Unknown Doctor',
                specialization: 'Unknown',
              },
          state: consultation.getState(),
          startedAt: consultation.getStartedAt(),
          completedAt: consultation.getCompletedAt(),
          durationMinutes: consultation.getDuration()?.getMinutes(),
          outcomeType: consultation.getOutcomeType(),
          patientDecision,
          notesSummary,
          photoCount: photos.length,
          hasBeforePhotos: beforePhotosByAppointment.has(appointmentId),
          hasAfterPhotos: afterPhotosByAppointment.has(appointmentId),
          hasCasePlan: !!casePlan,
          casePlanId: casePlan?.id,
          patientProceeded,
        };
      })
      .sort((a, b) => {
        // Sort by appointment date (most recent first)
        return b.appointmentDate.getTime() - a.appointmentDate.getTime();
      });

    // Step 8: Calculate summary statistics
    const completed = consultationItems.filter((item) => item.state === ConsultationState.COMPLETED);
    const proceduresRecommended = consultationItems.filter(
      (item) => item.outcomeType === 'PROCEDURE_RECOMMENDED' || item.outcomeType === 'PATIENT_DECIDING'
    );
    const proceduresProceeded = consultationItems.filter((item) => item.patientProceeded);
    const totalPhotos = consultationItems.reduce((sum, item) => sum + item.photoCount, 0);

    // Step 9: Return response DTO
    return {
      patientId,
      totalCount: consultationItems.length,
      consultations: consultationItems,
      summary: {
        total: consultationItems.length,
        completed: completed.length,
        proceduresRecommended: proceduresRecommended.length,
        proceduresProceeded: proceduresProceeded.length,
        totalPhotos,
      },
    };
  }
}
