import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { StartConsultationDto } from '../dtos/StartConsultationDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: StartConsultationUseCase
 * 
 * Orchestrates the start of a consultation between a doctor and patient.
 * 
 * Business Purpose:
 * - Marks consultation as started (appointment remains SCHEDULED or becomes SCHEDULED)
 * - Stores initial doctor notes
 * - Validates appointment can be started
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the consultation workflow:
 * 1. Check-in → CheckInPatientUseCase
 * 2. Start consultation → StartConsultationUseCase (this)
 * 3. Complete consultation → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment must be SCHEDULED or PENDING (cannot start cancelled/completed)
 * - Doctor ID must match appointment's doctor
 * - Consultation notes are optional but recommended
 * - Audit trail required for all consultation starts
 */
export class StartConsultationUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly auditService: IAuditService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
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

    // Step 3: Validate appointment can be started
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot start consultation for a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot start consultation for a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 4: Update appointment with notes and ensure status is SCHEDULED
    let updatedAppointment = appointment;

    // If status is PENDING, update to SCHEDULED
    if (appointment.getStatus() === AppointmentStatus.PENDING) {
      updatedAppointment = ApplicationAppointmentMapper.updateStatus(
        updatedAppointment,
        AppointmentStatus.SCHEDULED,
      );
    }

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

    // Step 6: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: updatedAppointment.getId().toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Consultation started for appointment ${dto.appointmentId} by doctor ${dto.doctorId}`,
    });

    // Step 7: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
