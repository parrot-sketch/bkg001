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
