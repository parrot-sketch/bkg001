import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { ConfirmAppointmentDto } from '../dtos/ConfirmAppointmentDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import { DoctorConfirmation, ConfirmationMethod } from '../../domain/value-objects/DoctorConfirmation';
import { AppointmentRejection, RejectionReason } from '../../domain/value-objects/AppointmentRejection';
import { AppointmentStateTransitionService, StateTransitionResult } from '../../domain/services/AppointmentStateTransitionService';

/**
 * Use Case: ConfirmAppointmentUseCase
 * 
 * Orchestrates the confirmation of a pending appointment by a doctor.
 * 
 * Business Purpose:
 * - Allows doctor to confirm or reject appointments pending their confirmation
 * - Confirmation: Appointment status changes to SCHEDULED (time slot locked)
 * - Rejection: Appointment status changes to CANCELLED (time slot freed)
 * - Sends notifications to patient and frontdesk
 * - Records audit event
 * 
 * Workflow:
 * 1. Frontdesk schedules appointment → PENDING_DOCTOR_CONFIRMATION
 * 2. Doctor receives notification
 * 3. Doctor confirms → Status changes to SCHEDULED
 *    └─ Time slot is now locked
 *    └─ Patient notified: "Appointment confirmed"
 * OR
 * 3. Doctor rejects → Status changes to CANCELLED
 *    └─ Time slot is freed
 *    └─ Patient notified: "Appointment cancelled - reason provided"
 *    └─ Frontdesk notified: "Doctor rejected appointment"
 * 
 * Business Rules:
 * - Only appointments in PENDING_DOCTOR_CONFIRMATION status can be confirmed/rejected
 * - Rejection requires a reason
 * - All actions are recorded in audit trail
 * - Notifications sent to patient and frontdesk
 * 
 * Phase 2 Enhancement:
 * - Uses DoctorConfirmation value object for confirmation details
 * - Uses AppointmentStateTransitionService for state machine validation
 * - Updates Phase 1 temporal fields: doctorConfirmedAt, doctorConfirmedBy
 * - Integrates domain rules for status transitions
 */
export class ConfirmAppointmentUseCase {
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
   * Executes the confirm appointment use case
   * 
   * @param dto - ConfirmAppointmentDto with confirmation action
   * @param userId - User ID performing the action (doctor ID)
   * @returns Promise resolving to AppointmentResponseDto with updated appointment
   * @throws DomainException if validation fails or state transition is invalid
   */
  async execute(dto: ConfirmAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 1: Load appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate state transition using Phase 2 domain service
    // PHASE 2 INTEGRATION: Use AppointmentStateTransitionService for state validation
    const currentStatus = appointment.getStatus();
    if (currentStatus !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      throw new DomainException(
        `Appointment must be in PENDING_DOCTOR_CONFIRMATION status to confirm. Current status: ${currentStatus}`,
        {
          appointmentId: dto.appointmentId,
          currentStatus,
        }
      );
    }

    // Step 3: Load patient for notifications
    const patient = await this.patientRepository.findById(appointment.getPatientId());
    if (!patient) {
      throw new DomainException(`Patient with ID ${appointment.getPatientId()} not found`, {
        patientId: appointment.getPatientId(),
      });
    }

    // Step 4: Validate confirmation input
    if (dto.action === 'confirm') {
      // Confirmation requires optional notes, no special validation needed
      if (dto.notes && dto.notes.length > 1000) {
        throw new DomainException('Confirmation notes cannot exceed 1000 characters', {
          appointmentId: dto.appointmentId,
          notesLength: dto.notes.length,
        });
      }
    } else {
      // Rejection requires a reason
      if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
        throw new DomainException('Rejection reason is required when rejecting an appointment', {
          appointmentId: dto.appointmentId,
        });
      }
      if (dto.rejectionReason.length > 500) {
        throw new DomainException('Rejection reason cannot exceed 500 characters', {
          appointmentId: dto.appointmentId,
          reasonLength: dto.rejectionReason.length,
        });
      }
    }

    // Step 5: Create DoctorConfirmation value object (Phase 2)
    // PHASE 2 INTEGRATION: Use DoctorConfirmation value object to encapsulate confirmation details
    const doctorConfirmation = DoctorConfirmation.create({
      confirmedBy: userId,
      confirmedAt: this.timeService.now(),
      confirmationMethod: ConfirmationMethod.DIRECT_CONFIRMATION,
      notes: dto.action === 'confirm' ? (dto.notes || '') : dto.rejectionReason || '',
    });

    // Step 6: Validate state transition using Phase 2 service
    // PHASE 2 INTEGRATION: Use AppointmentStateTransitionService to validate state transitions
    let transitionResult: StateTransitionResult;
    
    if (dto.action === 'confirm') {
      transitionResult = AppointmentStateTransitionService.onDoctorConfirmation(currentStatus);
      if (!transitionResult.isValid) {
        throw new DomainException(transitionResult.reason || 'Invalid state transition');
      }
    } else {
      transitionResult = AppointmentStateTransitionService.onDoctorRejection(currentStatus);
      if (!transitionResult.isValid) {
        throw new DomainException(transitionResult.reason || 'Invalid state transition');
      }
    }

    // Step 7: Apply the transition to the appointment
    // Update the appointment status with the new status from the state transition
    let updatedAppointment = appointment;
    
    if (dto.action === 'confirm') {
      updatedAppointment = appointment.confirmWithDoctor(doctorConfirmation);
    } else {
      // For rejection, create an AppointmentRejection value object
      const rejection = AppointmentRejection.create({
        rejectedAt: this.timeService.now(),
        rejectedBy: userId,
        reasonCategory: RejectionReason.OTHER,
        reasonDetails: dto.rejectionReason || 'No reason provided',
        notes: dto.notes,
      });
      updatedAppointment = appointment.rejectByDoctor(rejection);
    }

    // Step 7.5: Save appointment with new status
    await this.appointmentRepository.update(updatedAppointment);

    // Step 8: Send notifications based on action
    try {
      if (dto.action === 'confirm') {
        // Notify patient: appointment confirmed
        await this.notificationService.sendEmail(
          patient.getEmail(),
          'Appointment Confirmed',
          `Your appointment on ${appointment.getAppointmentDate().toLocaleDateString()} at ${appointment.getTime()} has been confirmed by the doctor.${dto.notes ? `\n\nNotes: ${dto.notes}` : ''}`,
        );
      } else {
        // Notify patient: appointment rejected
        await this.notificationService.sendEmail(
          patient.getEmail(),
          'Appointment Status Update',
          `Your appointment scheduled for ${appointment.getAppointmentDate().toLocaleDateString()} at ${appointment.getTime()} has been cancelled. Reason: ${dto.rejectionReason}. Please contact the clinic to reschedule.`,
        );
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the use case if notification fails
    }

    // Step 9: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: appointment.getId().toString(),
      action: dto.action === 'confirm' ? 'CONFIRM' : 'REJECT',
      model: 'Appointment',
      details: dto.action === 'confirm' 
        ? `Doctor confirmed appointment for patient ${patient.getFullName()}${dto.notes ? ` with notes: ${dto.notes}` : ''}`
        : `Doctor rejected appointment for patient ${patient.getFullName()}. Reason: ${dto.rejectionReason}`,
    });

    // Step 10: Map to response DTO
    const responseDto = AppointmentMapper.toResponseDto(updatedAppointment);
    
    return responseDto;
  }
}
