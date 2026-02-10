import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IConsultationRepository } from '../../domain/interfaces/repositories/IConsultationRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus, canStartConsultation } from '../../domain/enums/AppointmentStatus';
import { ConsultationState } from '../../domain/enums/ConsultationState';
import { StartConsultationDto } from '../dtos/StartConsultationDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { Consultation } from '../../domain/entities/Consultation';
import { ConsultationNotes } from '../../domain/value-objects/ConsultationNotes';
import { DomainException } from '../../domain/exceptions/DomainException';
import { AppointmentStateTransitionService } from '../../domain/services/AppointmentStateTransitionService';
import db from '@/lib/db';

/**
 * Use Case: StartConsultationUseCase
 * 
 * Orchestrates the start of a consultation between a doctor and patient.
 * 
 * Business Purpose:
 * - Transitions appointment from CHECKED_IN/READY_FOR_CONSULTATION → IN_CONSULTATION
 * - Creates or updates consultation record
 * - Stores initial doctor notes
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the consultation workflow:
 * 1. Patient books → PENDING/SCHEDULED
 * 2. Frontdesk checks in patient → CHECKED_IN (CheckInPatientUseCase)
 * 3. (Optional) Nurse preps patient → READY_FOR_CONSULTATION
 * 4. Doctor starts consultation → IN_CONSULTATION (this use case)
 * 5. Doctor completes consultation → COMPLETED (CompleteConsultationUseCase)
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment must be CHECKED_IN or READY_FOR_CONSULTATION
 * - Patient must have been checked in before consultation can start
 * - Doctor ID must match appointment's doctor
 * - Consultation notes are optional but recommended
 * - Audit trail required for all consultation starts
 */
export class StartConsultationUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly consultationRepository: IConsultationRepository,
    private readonly auditService: IAuditService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!consultationRepository) {
      throw new Error('ConsultationRepository is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the start consultation use case
   * 
   * @param dto - StartConsultationDto with appointment ID and doctor notes
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if appointment not found or cannot be started
   */
  async execute(dto: StartConsultationDto): Promise<AppointmentResponseDto> {
    // Step 0: Concurrency guard — doctor cannot have two active consultations
    // Also heal stale data: appointments stuck in IN_CONSULTATION from old code paths
    // where completion didn't properly update the appointment status.
    const staleOrActive = await db.appointment.findMany({
      where: {
        doctor_id: dto.doctorId,
        status: 'IN_CONSULTATION',
        id: { not: dto.appointmentId }, // exclude current (idempotent re-start)
      },
      select: {
        id: true,
        appointment_date: true,
        consultation_ended_at: true,
        patient: { select: { first_name: true, last_name: true } },
        consultation: { select: { completed_at: true, outcome_type: true } },
      },
    });

    // Auto-heal: fix any stale IN_CONSULTATION appointments that are actually done.
    // Detect stale records via multiple signals (old code may have set some but not others):
    //  1. consultation.completed_at is set
    //  2. consultation.outcome_type is set (doctor submitted outcome)
    //  3. appointment.consultation_ended_at is set
    //  4. no consultation record exists at all (orphaned status)
    //  5. appointment date is not today (a past-day IN_CONSULTATION is definitely stale)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const trulyActive = [];
    for (const apt of staleOrActive) {
      const aptDate = new Date(apt.appointment_date);
      const isFromToday = aptDate >= todayStart && aptDate < todayEnd;

      const isStale =
        apt.consultation?.completed_at != null ||
        apt.consultation?.outcome_type != null ||
        apt.consultation_ended_at != null ||
        apt.consultation === null ||
        !isFromToday; // past-day appointment still IN_CONSULTATION = definitely stale

      if (isStale) {
        await db.appointment.update({
          where: { id: apt.id },
          data: { status: 'COMPLETED' },
        });
        console.log(`[StartConsultation] Auto-healed stale appointment #${apt.id} → COMPLETED (from ${aptDate.toISOString().slice(0, 10)})`);
      } else {
        trulyActive.push(apt);
      }
    }

    if (trulyActive.length > 0) {
      const active = trulyActive[0];
      const patientName = active.patient
        ? `${active.patient.first_name} ${active.patient.last_name}`
        : `appointment #${active.id}`;
      throw new DomainException(
        `You already have an active consultation with ${patientName}. Please complete it first.`,
        {
          appointmentId: dto.appointmentId,
          activeAppointmentId: active.id,
        },
      );
    }

    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate doctor ID matches appointment
    if (appointment.getDoctorId() !== dto.doctorId) {
      throw new DomainException(
        `Doctor ${dto.doctorId} is not assigned to appointment ${dto.appointmentId}`,
        {
          appointmentId: dto.appointmentId,
          doctorId: dto.doctorId,
          assignedDoctorId: appointment.getDoctorId(),
        },
      );
    }

    // Step 3: Validate appointment can be started using state transition service
    const currentStatus = appointment.getStatus();
    const transitionResult = AppointmentStateTransitionService.onConsultationStart(currentStatus);
    
    if (!transitionResult.isValid) {
      // Natural, clinical-friendly error messages
      let message: string;
      
      if (currentStatus === AppointmentStatus.SCHEDULED || 
          currentStatus === AppointmentStatus.PENDING ||
          currentStatus === AppointmentStatus.CONFIRMED) {
        message = 'Patient hasn\'t arrived yet';
      } else if (currentStatus === AppointmentStatus.CANCELLED) {
        message = 'This appointment was cancelled';
      } else if (currentStatus === AppointmentStatus.COMPLETED) {
        message = 'This consultation has already been completed';
      } else if (currentStatus === AppointmentStatus.IN_CONSULTATION) {
        message = 'Consultation already in progress';
      } else if (currentStatus === AppointmentStatus.NO_SHOW) {
        message = 'Patient was marked as no-show';
      } else {
        message = transitionResult.reason || 'Unable to start consultation';
      }
      
      throw new DomainException(message, {
        appointmentId: dto.appointmentId,
        status: currentStatus,
      });
    }

    // Step 4: Update appointment status to IN_CONSULTATION
    let updatedAppointment = ApplicationAppointmentMapper.updateStatus(
      appointment,
      AppointmentStatus.IN_CONSULTATION,
    );

    // Add doctor notes if provided
    if (dto.doctorNotes) {
      const existingNote = appointment.getNote() || '';
      const combinedNote = existingNote
        ? `${existingNote}\n\n[Consultation Started] ${dto.doctorNotes}`
        : `[Consultation Started] ${dto.doctorNotes}`;
      updatedAppointment = ApplicationAppointmentMapper.updateNote(updatedAppointment, combinedNote);
    }

    // Step 5: Save updated appointment
    await this.appointmentRepository.update(updatedAppointment);

    // Step 6: Create or update consultation record
    let consultation = await this.consultationRepository.findByAppointmentId(dto.appointmentId);
    
    if (!consultation) {
      // Create new consultation in NOT_STARTED state
      // Note: userId will be set when consultation is started via the start() method
      consultation = Consultation.create({
        id: 0, // Will be generated by database
        appointmentId: dto.appointmentId,
        doctorId: dto.doctorId,
      });
      
      // Save to get the generated ID
      consultation = await this.consultationRepository.save(consultation);
    }
    
    // Start the consultation (transition to IN_PROGRESS)
    if (consultation.getState() !== ConsultationState.IN_PROGRESS) {
      const startedConsultation = consultation.start(dto.userId, new Date());
      
      // Add initial notes if provided
      if (dto.doctorNotes) {
        const notes = ConsultationNotes.createRaw(dto.doctorNotes);
        const consultationWithNotes = startedConsultation.updateNotes(notes);
        await this.consultationRepository.update(consultationWithNotes);
      } else {
        await this.consultationRepository.update(startedConsultation);
      }
    }

    // Step 7: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: updatedAppointment.getId().toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Consultation started for appointment ${dto.appointmentId} by doctor ${dto.doctorId}`,
    });

    // Step 8: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
