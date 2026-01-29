import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { AppointmentRejection, RejectionReason } from '../../domain/value-objects/AppointmentRejection';
import { AppointmentStateTransitionService } from '../../domain/services/AppointmentStateTransitionService';
import { RejectAppointmentDto } from '../dtos/RejectAppointmentDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: RejectAppointmentUseCase
 * 
 * Orchestrates the rejection of a pending appointment by a doctor.
 * 
 * Business Purpose:
 * - Allows doctor to reject appointments pending their confirmation
 * - Rejection: Appointment status changes to CANCELLED
 * - Records rejection reason for follow-up
 * - Frees the time slot for other appointments
 * - Sends notifications to patient and frontdesk
 * - Records audit event
 * 
 * Workflow:
 * 1. Frontdesk schedules appointment → PENDING_DOCTOR_CONFIRMATION
 * 2. Doctor receives notification
 * 3. Doctor rejects → Status changes to CANCELLED
 *    └─ Time slot is freed
 *    └─ Rejection reason recorded (medical, unavailable, conflict, etc)
 *    └─ Patient notified with rejection reason
 *    └─ Frontdesk notified to reschedule
 * 
 * Business Rules:
 * - Only appointments in PENDING_DOCTOR_CONFIRMATION status can be rejected
 * - Rejection requires a reason (mandatory field)
 * - Rejection can have a category (helps with analytics/follow-up)
 * - All actions are recorded in audit trail
 * - Notifications sent to patient and frontdesk
 * - Cannot reject already confirmed appointments
 * 
 * Phase 3 Enhancement:
 * - Uses AppointmentRejection value object for structured rejection data
 * - Uses AppointmentStateTransitionService for state validation
 * - Integrates Phase 1 temporal fields
 * - Provides category-based rejection tracking for follow-up logic
 */
export class RejectAppointmentUseCase {
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
   * Executes the reject appointment use case
   * 
   * @param dto - RejectAppointmentDto with rejection details
   * @param doctorId - Doctor ID performing the rejection
   * @returns Promise resolving to AppointmentResponseDto with updated appointment
   * @throws DomainException if validation fails
   */
  async execute(dto: RejectAppointmentDto, doctorId: string): Promise<AppointmentResponseDto> {
    // Step 1: Load appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate state transition using domain service
    const currentStatus = appointment.getStatus();
    const transitionResult = AppointmentStateTransitionService.onDoctorRejection(currentStatus);
    
    if (!transitionResult.isValid) {
      throw new DomainException(
        `Cannot reject appointment: ${transitionResult.reason}`,
        {
          appointmentId: dto.appointmentId,
          currentStatus,
        }
      );
    }

    // Step 3: Validate rejection input
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new DomainException('Rejection reason is required', {
        appointmentId: dto.appointmentId,
      });
    }

    if (dto.reason.length > 1000) {
      throw new DomainException('Rejection reason cannot exceed 1000 characters', {
        appointmentId: dto.appointmentId,
        reasonLength: dto.reason.length,
      });
    }

    // Step 4: Create rejection value object with category
    const rejectionCategory = (dto.reasonCategory as RejectionReason) || RejectionReason.OTHER;
    const rejection = AppointmentRejection.create({
      rejectedAt: this.timeService.now(),
      rejectedBy: doctorId,
      reasonCategory: rejectionCategory,
      reasonDetails: dto.reason.trim(),
      notes: dto.notes?.trim(),
    });

    // Step 5: Apply rejection to appointment entity (uses domain logic)
    const rejectedAppointment = appointment.rejectByDoctor(rejection);

    // Step 6: Save rejected appointment
    await this.appointmentRepository.update(rejectedAppointment);

    // Step 7: Notify patient about rejection
    try {
      // Load patient to get email
      const patient = await this.patientRepository.findById(appointment.getPatientId());
      if (patient?.getEmail()) {
        await this.notificationService.sendEmail(
          patient.getEmail(),
          'Appointment Rejection Notice',
          `Your appointment on ${appointment.getAppointmentDate().toLocaleDateString()} at ${appointment.getTime()} has been rejected. Reason: ${dto.reason}`
        );
      }
    } catch (error) {
      // Log but don't fail - notification failure should not block the rejection
      console.error('Failed to send rejection notification:', error);
    }

    // Step 8: Record audit event
    await this.auditService.recordEvent({
      userId: doctorId,
      recordId: dto.appointmentId.toString(),
      action: 'REJECT',
      model: 'Appointment',
      details: `Doctor rejected appointment. Reason: ${dto.reason}`,
    });

    // Step 9: Map to response DTO
    return ApplicationAppointmentMapper.toResponseDto(rejectedAppointment);
  }
}
