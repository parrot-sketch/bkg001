import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { isValidConsultationRequestTransition, isConsultationRequestModifiable } from '../../domain/enums/ConsultationRequestStatus';
import { ConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { ReviewConsultationRequestDto } from '../dtos/ReviewConsultationRequestDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: ReviewConsultationRequestUseCase
 * 
 * Orchestrates the review of a consultation request by Frontdesk (surgeon's assistant).
 * 
 * Business Purpose:
 * - Allows Frontdesk to approve, request more info, or reject consultation requests
 * - Enforces role permissions (only FRONTDESK can review)
 * - Validates state transitions
 * - Sets proposed appointment time if approved
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This is the second step in the consultation request workflow:
 * 1. Patient submits → SubmitConsultationRequestUseCase
 * 2. Frontdesk reviews → ReviewConsultationRequestUseCase (this)
 * 3. Patient confirms → ConfirmConsultationUseCase
 * 
 * Business Rules:
 * - Only FRONTDESK role can review requests
 * - Consultation request must be in reviewable state (SUBMITTED, PENDING_REVIEW, NEEDS_MORE_INFO)
 * - If approved: proposed date/time must be provided
 * - If needs_more_info: review notes must be provided
 * - State transitions must be valid
 */
export class ReviewConsultationRequestUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly userRepository: IUserRepository,
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
    if (!userRepository) {
      throw new Error('UserRepository is required');
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
   * Executes the review consultation request use case
   * 
   * @param dto - ReviewConsultationRequestDto with review action and data
   * @param userId - User ID performing the review (must be FRONTDESK)
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if validation fails or permissions denied
   */
  async execute(dto: ReviewConsultationRequestDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Validate reviewer is Frontdesk
    const reviewer = await this.userRepository.findById(userId);
    if (!reviewer) {
      throw new DomainException(`User with ID ${userId} not found`, {
        userId,
      });
    }

    if (reviewer.getRole() !== 'FRONTDESK') {
      throw new DomainException('Only Frontdesk staff can review consultation requests', {
        userId,
        role: reviewer.getRole(),
      });
    }

    // Step 2: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 3: Get current consultation request status from database
    let currentConsultationFields: ConsultationRequestFields | null = null;
    try {
      currentConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
      // If retrieval fails, assume SUBMITTED for validation
      currentConsultationFields = { consultationRequestStatus: ConsultationRequestStatus.SUBMITTED };
    }
    
    // Step 4: Validate action-specific requirements
    if (dto.action === 'approve') {
      if (!dto.proposedDate || !dto.proposedTime) {
        throw new DomainException('Proposed date and time are required when approving a consultation request', {
          appointmentId: dto.appointmentId,
          action: dto.action,
        });
      }

      // Validate proposed date is not in the past
      const now = this.timeService.now();
      const proposedDateTime = new Date(dto.proposedDate);
      proposedDateTime.setHours(0, 0, 0, 0);
      
      if (proposedDateTime < now) {
        throw new DomainException('Proposed appointment date cannot be in the past', {
          appointmentId: dto.appointmentId,
          proposedDate: dto.proposedDate,
        });
      }
    }

    if (dto.action === 'needs_more_info' && !dto.reviewNotes) {
      throw new DomainException('Review notes are required when requesting more information', {
        appointmentId: dto.appointmentId,
        action: dto.action,
      });
    }

    // Step 5: Determine new consultation request status based on action
    let newConsultationStatus: ConsultationRequestStatus;
    
    switch (dto.action) {
      case 'approve':
        newConsultationStatus = ConsultationRequestStatus.APPROVED;
        break;
      case 'needs_more_info':
        newConsultationStatus = ConsultationRequestStatus.NEEDS_MORE_INFO;
        break;
      case 'reject':
        // Rejection is handled via AppointmentStatus.CANCELLED
        // Consultation request status can be left as-is or set to final state
        // For now, we'll keep the workflow status and mark appointment as CANCELLED
        const cancelledAppointment = ApplicationAppointmentMapper.updateStatus(
          appointment,
          AppointmentStatus.CANCELLED,
        );
        await this.appointmentRepository.update(cancelledAppointment);
        
        // Send notification
        const patient = await this.patientRepository.findById(appointment.getPatientId());
        if (patient) {
          try {
            await this.notificationService.sendEmail(
              patient.getEmail(),
              'Consultation Request Update',
              `We regret to inform you that your consultation request has been declined. ${dto.reviewNotes ? `Reason: ${dto.reviewNotes}` : ''}`,
            );
          } catch (error) {
            console.error('Failed to send rejection notification:', error);
          }
        }
        
        // Record audit
        await this.auditService.recordEvent({
          userId,
          recordId: dto.appointmentId.toString(),
          action: 'UPDATE',
          model: 'ConsultationRequest',
          details: `Frontdesk rejected consultation request. Reason: ${dto.reviewNotes || 'N/A'}`,
        });
        
        return ApplicationAppointmentMapper.toResponseDto(cancelledAppointment);
      
      default:
        throw new DomainException(`Invalid review action: ${dto.action}`, {
          appointmentId: dto.appointmentId,
          action: dto.action,
        });
    }

    // Step 6: Validate state transition
    const currentStatus = currentConsultationFields?.consultationRequestStatus ?? ConsultationRequestStatus.SUBMITTED;
    if (!isValidConsultationRequestTransition(currentStatus, newConsultationStatus)) {
      throw new DomainException('Invalid consultation request status transition', {
        appointmentId: dto.appointmentId,
        from: currentStatus,
        to: newConsultationStatus,
      });
    }

    // Step 7: Update appointment if approved (set proposed date/time)
    let updatedAppointment = appointment;
    if (dto.action === 'approve' && dto.proposedDate && dto.proposedTime) {
      // Create new appointment entity with updated date/time
      // Note: This is a workaround since Appointment is immutable
      // In production, we might want to add a method to update date/time
      updatedAppointment = ApplicationAppointmentMapper.fromScheduleDto(
        {
          patientId: appointment.getPatientId(),
          doctorId: appointment.getDoctorId() || '', // Should be set by now
          appointmentDate: dto.proposedDate,
          time: dto.proposedTime,
          type: appointment.getType(),
          note: appointment.getNote(),
        },
        AppointmentStatus.PENDING, // Still PENDING until patient confirms
        appointment.getId(),
      );
    }

    // Step 8: Save updated appointment with consultation request fields
    const now = this.timeService.now();
    const consultationRequestFields: ConsultationRequestFields = {
      consultationRequestStatus: newConsultationStatus,
      reviewedBy: userId,
      reviewedAt: now,
      reviewNotes: dto.reviewNotes ?? null,
    };
    
    // Cast repository to access extended update method (optional consultation request parameter)
    (this.appointmentRepository as any).update(updatedAppointment, consultationRequestFields);

    // Step 9: Retrieve updated appointment
    const savedAppointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!savedAppointment) {
      throw new Error('Failed to retrieve updated appointment');
    }

    // Step 10: Send notification to patient
    const patient = await this.patientRepository.findById(appointment.getPatientId());
    if (patient) {
      try {
        let subject: string;
        let message: string;

        if (dto.action === 'approve') {
          subject = 'Consultation Request Approved';
          message = `Your consultation request has been approved and is ready to be scheduled. ${dto.proposedDate && dto.proposedTime ? `Proposed date: ${dto.proposedDate.toLocaleDateString()} at ${dto.proposedTime}.` : ''} Please confirm your availability.`;
        } else {
          subject = 'Consultation Request - Additional Information Needed';
          message = `We need additional information to proceed with your consultation request. ${dto.reviewNotes || 'Please contact our office for details.'}`;
        }

        await this.notificationService.sendEmail(patient.getEmail(), subject, message);
      } catch (error) {
        console.error('Failed to send review notification:', error);
      }
    }

    // Step 11: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: dto.appointmentId.toString(),
      action: 'UPDATE',
      model: 'ConsultationRequest',
      details: `Frontdesk reviewed consultation request: ${dto.action}. ${dto.reviewNotes ? `Notes: ${dto.reviewNotes}` : ''}`,
    });

    // Step 12: Retrieve consultation request fields for response
    let updatedConsultationFields: ConsultationRequestFields | null = null;
    try {
      updatedConsultationFields = await (this.appointmentRepository as any).getConsultationRequestFields(dto.appointmentId);
    } catch (error) {
      console.error('Failed to retrieve consultation request fields:', error);
    }

    // Step 13: Map domain entity to response DTO with consultation request fields
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment, updatedConsultationFields);
    
    return responseDto;
  }
}