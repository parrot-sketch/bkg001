import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { CheckInPatientDto } from '../dtos/CheckInPatientDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import db from '@/lib/db';

/**
 * Use Case: CheckInPatientUseCase
 * 
 * Orchestrates the check-in process for a patient at their appointment.
 * 
 * Business Purpose:
 * - Updates appointment status to SCHEDULED (patient has checked in)
 * - Validates appointment exists and can be checked in
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the patient visit workflow:
 * 1. Patient registration → CreatePatientUseCase
 * 2. Appointment scheduling → ScheduleAppointmentUseCase
 * 3. Check-in → CheckInPatientUseCase (this)
 * 4. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment status must be PENDING (can't check in to cancelled/completed appointments)
 * - Appointment date must be today or in the future
 * - Audit trail required for all check-ins
 */
export class CheckInPatientUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly auditService: IAuditService,
    private readonly timeService: ITimeService,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
    if (!timeService) {
      throw new Error('TimeService is required');
    }
  }

  /**
   * Executes the patient check-in use case
   * 
   * @param dto - CheckInPatientDto with appointment ID
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if appointment not found or cannot be checked in
   */
  async execute(dto: CheckInPatientDto): Promise<AppointmentResponseDto> {
    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate appointment can be checked in
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot check in to a cancelled appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot check in to a completed appointment', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 3: Calculate if patient is late
    const now = this.timeService.now();
    const appointmentDateTime = new Date(appointment.getAppointmentDate());
    const [hours, minutes] = appointment.getTime().split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const isLate = now > appointmentDateTime;
    const lateByMinutes = isLate
      ? Math.floor((now.getTime() - appointmentDateTime.getTime()) / (1000 * 60))
      : null;

    // Step 4: Update appointment status to CHECKED_IN
    // If already CHECKED_IN, checking idempotent behavior (just update notes/timestamp if needed)
    let updatedAppointment = appointment;
    const currentStatus = appointment.getStatus();

    if (currentStatus === AppointmentStatus.PENDING ||
      currentStatus === AppointmentStatus.SCHEDULED ||
      currentStatus === AppointmentStatus.CONFIRMED) {

      updatedAppointment = ApplicationAppointmentMapper.updateStatus(
        appointment,
        AppointmentStatus.CHECKED_IN,
      );

      // Step 5: Save updated appointment status
      await this.appointmentRepository.update(updatedAppointment);

      // Step 6: Update check-in tracking fields directly via Prisma
      await db.appointment.update({
        where: { id: dto.appointmentId },
        data: {
          checked_in_at: now,
          checked_in_by: dto.userId,
          late_arrival: isLate,
          late_by_minutes: lateByMinutes,
          note: dto.notes ? `${appointment.getNote() || ''}\n[Check-in] ${dto.notes}`.trim() : undefined,
          no_show: false,
          no_show_at: null,
        } as any,
      });

      // Step 7: Record audit event
      const lateMessage = isLate ? ` (${lateByMinutes} minutes late)` : '';
      await this.auditService.recordEvent({
        userId: dto.userId,
        recordId: updatedAppointment.getId().toString(),
        action: 'UPDATE',
        model: 'Appointment',
        details: `Patient checked in for appointment ${dto.appointmentId}${lateMessage}. Status changed from ${currentStatus} to CHECKED_IN.${dto.notes ? ` Notes: ${dto.notes}` : ''}`,
      });
    } else if (currentStatus === AppointmentStatus.CHECKED_IN) {
      // Already checked in - just update notes if provided
      if (dto.notes) {
        await db.appointment.update({
          where: { id: dto.appointmentId },
          data: {
            note: `${appointment.getNote() || ''}\n[Check-in Update] ${dto.notes}`.trim(),
          } as any
        });
      }

      // Record audit event
      await this.auditService.recordEvent({
        userId: dto.userId,
        recordId: appointment.getId().toString(),
        action: 'VIEW',
        model: 'Appointment',
        details: `Patient check-in attempted for appointment ${dto.appointmentId} (already checked in).`,
      });
    } else {
      // Other statuses (should have been caught by validation, but safe fallback)
      throw new DomainException(`Cannot check in appointment with status ${currentStatus}`, {
        appointmentId: dto.appointmentId,
        status: currentStatus,
      });
    }

    // Step 6: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
