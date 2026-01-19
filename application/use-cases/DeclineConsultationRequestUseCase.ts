import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { DeclineConsultationRequestDto } from '../dtos/DeclineConsultationRequestDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: DeclineConsultationRequestUseCase
 * 
 * Orchestrates the decline of a consultation request by a doctor.
 * 
 * Business Purpose:
 * - Allows doctors to decline consultation requests assigned to them
 * - Validates doctor assignment (doctor must be assigned to the request)
 * - Cancels the appointment
 * - Records decline reason (optional but recommended)
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the consultation request workflow:
 * 1. Patient submits → SubmitConsultationRequestUseCase
 * 2. Frontdesk reviews → ReviewConsultationRequestUseCase
 * 3. Doctor declines → DeclineConsultationRequestUseCase (this)
 * 
 * Business Rules:
 * - Doctor must be assigned to consultation request (appointment.doctor_id == doctor.id)
 * - Consultation request must be in reviewable state (PENDING_REVIEW or APPROVED)
 * - Appointment must not be cancelled or completed
 * - Decline reason is optional but recommended
 */
export class DeclineConsultationRequestUseCase {
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
   * Executes the decline consultation request use case
   * 
   * @param dto - DeclineConsultationRequestDto with appointment ID, doctor ID, and optional reason
   * @returns Promise resolving to AppointmentResponseDto with cancelled appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: DeclineConsultationRequestDto): Promise<AppointmentResponseDto> {
    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate doctor assignment
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

    // Step 3: Validate appointment status
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Appointment is already cancelled', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot decline a consultation request for a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 4: Get current consultation request status
    let currentConsultationFields: ConsultationRequestFields | null = null;
    try {
      currentConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
      // Continue with decline even if we can't get current status
    }

    // Step 5: Cancel appointment
    const cancelledAppointment = ApplicationAppointmentMapper.updateStatus(
      appointment,
      AppointmentStatus.CANCELLED,
    );

    // Step 6: Add decline reason to notes
    const existingNote = appointment.getNote() || '';
    const declineNote = existingNote
      ? `${existingNote}\n\n[Doctor Declined] ${dto.reason || 'Consultation request declined by doctor.'}`
      : `[Doctor Declined] ${dto.reason || 'Consultation request declined by doctor.'}`;
    const updatedAppointment = ApplicationAppointmentMapper.updateNote(cancelledAppointment, declineNote);

    // Step 7: Save updated appointment
    await this.appointmentRepository.update(updatedAppointment);

    // Step 8: Send notification to patient
    const patient = await this.patientRepository.findById(appointment.getPatientId());
    if (patient) {
      try {
        const subject = 'Consultation Request Update';
        const message = `We regret to inform you that your consultation request has been declined.${
          dto.reason ? `\n\nReason: ${dto.reason}` : ''
        }`;

        await this.notificationService.sendEmail(patient.getEmail(), subject, message);
      } catch (error) {
        console.error('Failed to send decline notification:', error);
      }
    }

    // Step 9: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'ConsultationRequest',
      details: `Doctor declined consultation request.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
    });

    // Step 10: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
