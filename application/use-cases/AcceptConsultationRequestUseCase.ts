import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { isValidConsultationRequestTransition } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { AcceptConsultationRequestDto } from '../dtos/AcceptConsultationRequestDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: AcceptConsultationRequestUseCase
 * 
 * Orchestrates the acceptance of a consultation request by a doctor.
 * 
 * Business Purpose:
 * - Allows doctors to accept consultation requests assigned to them
 * - Validates doctor assignment (doctor must be assigned to the request)
 * - Optionally sets appointment date/time when accepting
 * - Updates consultation request status to APPROVED → SCHEDULED (if date/time set)
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the consultation request workflow:
 * 1. Patient submits → SubmitConsultationRequestUseCase
 * 2. Frontdesk reviews → ReviewConsultationRequestUseCase
 * 3. Doctor accepts → AcceptConsultationRequestUseCase (this)
 * 4. Patient confirms → ConfirmConsultationUseCase
 * 
 * Business Rules:
 * - Doctor must be assigned to consultation request (appointment.doctor_id == doctor.id)
 * - Consultation request must be in reviewable state (PENDING_REVIEW or APPROVED)
 * - Appointment must not be cancelled or completed
 * - If date/time provided, must be in the future
 * - State transitions must be valid
 */
export class AcceptConsultationRequestUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    private readonly timeService: ITimeService,
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
    if (!timeService) {
      throw new Error('TimeService is required');
    }
  }

  /**
   * Executes the accept consultation request use case
   * 
   * @param dto - AcceptConsultationRequestDto with appointment ID, doctor ID, and optional date/time
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: AcceptConsultationRequestDto): Promise<AppointmentResponseDto> {
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
      throw new DomainException('Cannot accept a consultation request for a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot accept a consultation request for a completed appointment', {
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
      throw new DomainException('Failed to retrieve consultation request status', {
        appointmentId: dto.appointmentId,
      });
    }

    const currentStatus = currentConsultationFields?.consultationRequestStatus ?? ConsultationRequestStatus.SUBMITTED;

    // Step 5: Validate consultation request is in reviewable state
    if (
      currentStatus !== ConsultationRequestStatus.PENDING_REVIEW &&
      currentStatus !== ConsultationRequestStatus.APPROVED
    ) {
      throw new DomainException(
        `Consultation request must be in PENDING_REVIEW or APPROVED state to be accepted. Current status: ${currentStatus}`,
        {
          appointmentId: dto.appointmentId,
          currentStatus,
        },
      );
    }

    // Step 6: Validate date/time if provided
    if (dto.appointmentDate && dto.time) {
      const now = this.timeService.now();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const proposedDateTime = new Date(dto.appointmentDate);
      proposedDateTime.setHours(0, 0, 0, 0);

      if (proposedDateTime < today) {
        throw new DomainException('Appointment date cannot be in the past', {
          appointmentId: dto.appointmentId,
          appointmentDate: dto.appointmentDate,
        });
      }
    }

    // Step 7: Determine new consultation request status
    let newConsultationStatus: ConsultationRequestStatus;
    let newAppointmentStatus: AppointmentStatus = appointment.getStatus();
    let updatedAppointment = appointment;

    if (dto.appointmentDate && dto.time) {
      // If date/time provided, transition to SCHEDULED
      newConsultationStatus = ConsultationRequestStatus.SCHEDULED;
      newAppointmentStatus = AppointmentStatus.SCHEDULED;

      // Update appointment with date/time
      updatedAppointment = ApplicationAppointmentMapper.fromScheduleDto(
        {
          patientId: appointment.getPatientId(),
          doctorId: appointment.getDoctorId(),
          appointmentDate: dto.appointmentDate,
          time: dto.time,
          type: appointment.getType(),
          note: appointment.getNote(),
        },
        newAppointmentStatus,
        appointment.getId(),
      );
    } else {
      // If no date/time, transition to APPROVED (awaiting scheduling)
      newConsultationStatus = ConsultationRequestStatus.APPROVED;
    }

    // Step 8: Validate state transition
    if (!isValidConsultationRequestTransition(currentStatus, newConsultationStatus)) {
      throw new DomainException('Invalid consultation request status transition', {
        appointmentId: dto.appointmentId,
        from: currentStatus,
        to: newConsultationStatus,
      });
    }

    // Step 9: Add notes if provided
    if (dto.notes) {
      const existingNote = appointment.getNote() || '';
      const combinedNote = existingNote
        ? `${existingNote}\n\n[Doctor Accepted] ${dto.notes}`
        : `[Doctor Accepted] ${dto.notes}`;
      updatedAppointment = ApplicationAppointmentMapper.updateNote(updatedAppointment, combinedNote);
    }

    // Step 10: Update appointment status if changed
    if (newAppointmentStatus !== appointment.getStatus()) {
      updatedAppointment = ApplicationAppointmentMapper.updateStatus(updatedAppointment, newAppointmentStatus);
    }

    // Step 11: Save updated appointment with consultation request fields
    const now = this.timeService.now();
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: newConsultationStatus,
      reviewedBy: dto.doctorId, // Doctor reviewed/accepted
      reviewedAt: now,
      reviewNotes: dto.notes ?? null,
    };

    await (this.appointmentRepository as any).update(updatedAppointment, consultationRequestFields);

    // Step 12: Retrieve updated appointment
    const savedAppointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!savedAppointment) {
      throw new Error('Failed to retrieve updated appointment');
    }

    // Step 13: Send notification to patient
    const patient = await this.patientRepository.findById(appointment.getPatientId());
    if (patient) {
      try {
        const subject = 'Consultation Request Accepted';
        const message = `Your consultation request has been accepted by Dr. ${dto.doctorId}.${dto.appointmentDate && dto.time
            ? ` Appointment scheduled for ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}.`
            : ' Please wait for scheduling confirmation.'
          }${dto.notes ? `\n\nNotes: ${dto.notes}` : ''}`;

        await this.notificationService.sendEmail(patient.getEmail(), subject, message);
      } catch (error) {
        console.error('Failed to send acceptance notification:', error);
      }
    }

    // Step 14: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'ConsultationRequest',
      details: `Doctor accepted consultation request. Status: ${currentStatus} → ${newConsultationStatus}.${dto.appointmentDate && dto.time ? ` Scheduled for ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}.` : ''}`,
    });

    // Step 15: Retrieve consultation request fields for response
    let updatedConsultationFields: ConsultationRequestFields | null = null;
    try {
      updatedConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
    }

    // Step 16: Map domain entity to response DTO
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, updatedConsultationFields);

    return responseDto;
  }
}
