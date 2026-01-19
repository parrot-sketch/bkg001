import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { CompleteConsultationDto } from '../dtos/CompleteConsultationDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import { ScheduleAppointmentDto } from '../dtos/ScheduleAppointmentDto';

/**
 * Use Case: CompleteConsultationUseCase
 * 
 * Orchestrates the completion of a consultation and optionally schedules follow-up.
 * 
 * Business Purpose:
 * - Marks appointment as COMPLETED
 * - Stores consultation outcome/notes
 * - Optionally schedules follow-up appointment
 * - Sends notification to patient
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the consultation completion workflow:
 * 1. Start consultation → StartConsultationUseCase
 * 2. Complete consultation → CompleteConsultationUseCase (this)
 * 3. (Optional) Schedule follow-up → ScheduleAppointmentUseCase
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment must be SCHEDULED or PENDING (cannot complete cancelled/completed)
 * - Doctor ID must match appointment's doctor
 * - Outcome/notes are required
 * - Follow-up appointment is optional but validated if provided
 * - Audit trail required for all consultation completions
 */
export class CompleteConsultationUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!patientRepository) {
      throw new Error('PatientRepository is required');
    }
    if (!notificationService) {
      throw new Error('NotificationService is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the complete consultation use case
   * 
   * @param dto - CompleteConsultationDto with appointment ID, outcome, and optional follow-up
   * @returns Promise resolving to AppointmentResponseDto with completed appointment data
   * @throws DomainException if appointment not found or cannot be completed
   */
  async execute(dto: CompleteConsultationDto): Promise<AppointmentResponseDto> {
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

    // Step 3: Validate appointment can be completed
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot complete a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Appointment is already completed', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 4: Update appointment with outcome and mark as COMPLETED
    let updatedAppointment = ApplicationAppointmentMapper.updateStatus(
      appointment,
      AppointmentStatus.COMPLETED,
    );

    // Add outcome to notes
    const existingNote = appointment.getNote() || '';
    const outcomeNote = existingNote
      ? `${existingNote}\n\n[Consultation Completed] ${dto.outcome}`
      : `[Consultation Completed] ${dto.outcome}`;
    updatedAppointment = ApplicationAppointmentMapper.updateNote(updatedAppointment, outcomeNote);

    // Step 5: Save updated appointment
    await this.appointmentRepository.update(updatedAppointment);

    // Step 6: Optionally schedule follow-up appointment
    let followUpAppointment: AppointmentResponseDto | undefined;
    if (dto.followUpDate && dto.followUpTime && dto.followUpType) {
      // Validate follow-up date is in the future
      const now = new Date();
      if (dto.followUpDate < now) {
        throw new DomainException('Follow-up appointment date must be in the future', {
          followUpDate: dto.followUpDate,
        });
      }

      // Note: We would normally call ScheduleAppointmentUseCase here,
      // but to avoid circular dependencies, we'll create the appointment directly
      // In a production system, we'd use dependency injection or a service orchestrator
      const followUpScheduleDto: ScheduleAppointmentDto = {
        patientId: appointment.getPatientId(),
        doctorId: appointment.getDoctorId(),
        appointmentDate: dto.followUpDate,
        time: dto.followUpTime,
        type: dto.followUpType,
        note: `Follow-up appointment for appointment ${dto.appointmentId}`,
      };

      const followUpEntity = ApplicationAppointmentMapper.fromScheduleDto(
        followUpScheduleDto,
        AppointmentStatus.PENDING,
        0, // Temporary ID
      );

      await this.appointmentRepository.save(followUpEntity);

      // Retrieve saved follow-up appointment
      const allPatientAppointments = await this.appointmentRepository.findByPatient(
        appointment.getPatientId(),
      );
      // Store followUpDate in a const to ensure type narrowing works in filter
      const followUpDate = dto.followUpDate;
      const savedFollowUp = allPatientAppointments
        .filter(
          (apt) =>
            apt.getDoctorId() === appointment.getDoctorId() &&
            apt.getAppointmentDate().getTime() === followUpDate.getTime() &&
            apt.getStatus() === AppointmentStatus.PENDING,
        )
        .sort(
          (a, b) =>
            (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0),
        )[0];

      if (savedFollowUp) {
        followUpAppointment = ApplicationAppointmentMapper.toResponseDto(savedFollowUp);
      }
    }

    // Step 7: Send notification to patient
    try {
      const patient = await this.patientRepository.findById(appointment.getPatientId());
      if (patient) {
        await this.notificationService.sendEmail(
          patient.getEmail(),
          'Consultation Completed',
          `Your consultation on ${appointment.getAppointmentDate().toLocaleDateString()} has been completed.\n\nOutcome: ${dto.outcome}${
            followUpAppointment
              ? `\n\nFollow-up appointment scheduled for ${followUpAppointment.appointmentDate.toLocaleDateString()} at ${followUpAppointment.time}.`
              : ''
          }`,
        );
      }
    } catch (error) {
      // Notification failure should not break the use case
      console.error('Failed to send completion notification:', error);
    }

    // Step 8: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: updatedAppointment.getId().toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Consultation completed for appointment ${dto.appointmentId} by doctor ${dto.doctorId}${followUpAppointment ? ` (follow-up scheduled: ${followUpAppointment.id})` : ''}`,
    });

    // Step 9: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
