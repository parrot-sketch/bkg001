import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { isValidConsultationRequestTransition } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { RequestMoreInfoConsultationRequestDto } from '../dtos/RequestMoreInfoConsultationRequestDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: RequestMoreInfoConsultationRequestUseCase
 * 
 * Orchestrates the request for more information on a consultation request by a doctor.
 * 
 * Business Purpose:
 * - Allows doctors to request more information from patients
 * - Validates doctor assignment (doctor must be assigned to the request)
 * - Updates consultation request status to NEEDS_MORE_INFO
 * - Records questions/notes for the patient
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is part of the consultation request workflow:
 * 1. Patient submits → SubmitConsultationRequestUseCase
 * 2. Frontdesk reviews → ReviewConsultationRequestUseCase
 * 3. Doctor requests more info → RequestMoreInfoConsultationRequestUseCase (this)
 * 4. Patient resubmits → SubmitConsultationRequestUseCase (loop)
 * 
 * Business Rules:
 * - Doctor must be assigned to consultation request (appointment.doctor_id == doctor.id)
 * - Consultation request must be in PENDING_REVIEW state
 * - Appointment must not be cancelled or completed
 * - Questions/notes are required
 * - State transitions must be valid
 */
export class RequestMoreInfoConsultationRequestUseCase {
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
   * Executes the request more info consultation request use case
   * 
   * @param dto - RequestMoreInfoConsultationRequestDto with appointment ID, doctor ID, and questions
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: RequestMoreInfoConsultationRequestDto): Promise<AppointmentResponseDto> {
    // Step 1: Validate questions are provided
    if (!dto.questions || dto.questions.trim().length === 0) {
      throw new DomainException('Questions are required when requesting more information', {
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
      throw new DomainException('Cannot request more information for a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot request more information for a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 5: Get current consultation request status
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

    // Step 6: Validate consultation request is in PENDING_REVIEW state
    if (currentStatus !== ConsultationRequestStatus.PENDING_REVIEW) {
      throw new DomainException(
        `Consultation request must be in PENDING_REVIEW state to request more information. Current status: ${currentStatus}`,
        {
          appointmentId: dto.appointmentId,
          currentStatus,
        },
      );
    }

    // Step 7: Validate state transition
    const newConsultationStatus = ConsultationRequestStatus.NEEDS_MORE_INFO;
    if (!isValidConsultationRequestTransition(currentStatus, newConsultationStatus)) {
      throw new DomainException('Invalid consultation request status transition', {
        appointmentId: dto.appointmentId,
        from: currentStatus,
        to: newConsultationStatus,
      });
    }

    // Step 8: Add notes if provided
    let updatedAppointment = appointment;
    const reviewNotes = dto.notes
      ? `Questions: ${dto.questions}\n\nAdditional Notes: ${dto.notes}`
      : dto.questions;

    if (dto.notes) {
      const existingNote = appointment.getNote() || '';
      const combinedNote = existingNote
        ? `${existingNote}\n\n[Doctor Requested More Info] ${reviewNotes}`
        : `[Doctor Requested More Info] ${reviewNotes}`;
      updatedAppointment = ApplicationAppointmentMapper.updateNote(updatedAppointment, combinedNote);
    }

    // Step 9: Save updated appointment with consultation request fields
    const now = this.timeService.now();
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: newConsultationStatus,
      reviewedBy: dto.doctorId, // Doctor reviewed/requested info
      reviewedAt: now,
      reviewNotes: reviewNotes,
    };

    await (this.appointmentRepository as any).update(updatedAppointment, consultationRequestFields);

    // Step 10: Retrieve updated appointment
    const savedAppointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!savedAppointment) {
      throw new Error('Failed to retrieve updated appointment');
    }

    // Step 11: Send notification to patient
    const patient = await this.patientRepository.findById(appointment.getPatientId());
    if (patient) {
      try {
        const subject = 'Consultation Request - Additional Information Needed';
        const message = `We need additional information to proceed with your consultation request.\n\n${reviewNotes}\n\nPlease provide the requested information so we can continue processing your request.`;

        await this.notificationService.sendEmail(patient.getEmail(), subject, message);
      } catch (error) {
        console.error('Failed to send more info request notification:', error);
      }
    }

    // Step 12: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'ConsultationRequest',
      details: `Doctor requested more information for consultation request. Questions: ${dto.questions}`,
    });

    // Step 13: Retrieve consultation request fields for response
    let updatedConsultationFields: ConsultationRequestFields | null = null;
    try {
      updatedConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
    }

    // Step 14: Map domain entity to response DTO
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, updatedConsultationFields);

    return responseDto;
  }
}
