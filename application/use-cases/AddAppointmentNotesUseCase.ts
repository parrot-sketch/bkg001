import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { AddAppointmentNotesDto } from '../dtos/AddAppointmentNotesDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: AddAppointmentNotesUseCase
 * 
 * Orchestrates adding/updating appointment notes (pre-consultation) by a doctor.
 * 
 * Business Purpose:
 * - Allows doctors to add pre-consultation notes
 * - Validates doctor assignment (doctor must be assigned to the appointment)
 * - Updates appointment notes
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the pre-consultation preparation:
 * 1. Appointment scheduled
 * 2. Doctor adds notes → AddAppointmentNotesUseCase (this)
 * 3. Consultation starts → StartConsultationUseCase
 * 
 * Business Rules:
 * - Doctor must be assigned to appointment (appointment.doctor_id == doctor.id)
 * - Appointment must not be cancelled or completed
 * - Notes are required
 */
export class AddAppointmentNotesUseCase {
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
   * Executes the add appointment notes use case
   * 
   * @param dto - AddAppointmentNotesDto with appointment ID, doctor ID, and notes
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: AddAppointmentNotesDto): Promise<AppointmentResponseDto> {
    // Step 1: Validate notes are provided
    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new DomainException('Notes are required', {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 3: Validate doctor assignment
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

    // Step 4: Validate appointment status
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot add notes to a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot add notes to a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 5: Update appointment notes
    const existingNote = appointment.getNote() || '';
    const combinedNote = existingNote
      ? `${existingNote}\n\n[Pre-Consultation Notes] ${dto.notes}`
      : `[Pre-Consultation Notes] ${dto.notes}`;
    const updatedAppointment = ApplicationAppointmentMapper.updateNote(appointment, combinedNote);

    // Step 6: Save updated appointment
    await this.appointmentRepository.update(updatedAppointment);

    // Step 7: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Doctor added pre-consultation notes to appointment ${dto.appointmentId}`,
    });

    // Step 8: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
