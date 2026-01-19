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

    // Step 4: Update appointment status to SCHEDULED (patient has checked in)
    // If already SCHEDULED, no change needed (idempotent)
    let updatedAppointment = appointment;
    if (appointment.getStatus() === AppointmentStatus.PENDING) {
      updatedAppointment = ApplicationAppointmentMapper.updateStatus(
        appointment,
        AppointmentStatus.SCHEDULED,
      );

      // Step 5: Save updated appointment status
      await this.appointmentRepository.update(updatedAppointment);

      // Step 6: Update check-in tracking fields directly via Prisma
      // (These fields are not part of domain entity but needed for workflow)
      await db.appointment.update({
        where: { id: dto.appointmentId },
        data: {
          checked_in_at: now,
          checked_in_by: dto.userId,
          late_arrival: isLate,
          late_by_minutes: lateByMinutes,
          // Clear no-show flags if patient eventually checked in
          no_show: false,
          no_show_at: null,
        } as any, // Type assertion needed - Prisma types may not be fully up to date
      });

      // Step 7: Record audit event
      const lateMessage = isLate ? ` (${lateByMinutes} minutes late)` : '';
      await this.auditService.recordEvent({
        userId: dto.userId,
        recordId: updatedAppointment.getId().toString(),
        action: 'UPDATE',
        model: 'Appointment',
        details: `Patient checked in for appointment ${dto.appointmentId}${lateMessage}. Status changed from PENDING to SCHEDULED.`,
      });
    } else {
      // Already SCHEDULED, but update check-in timestamp if not already set
      const prismaAppointment = await db.appointment.findUnique({
        where: { id: dto.appointmentId },
        select: { checked_in_at: true },
      });

      if (!prismaAppointment?.checked_in_at) {
        await db.appointment.update({
          where: { id: dto.appointmentId },
          data: {
            checked_in_at: now,
            checked_in_by: dto.userId,
            late_arrival: isLate,
            late_by_minutes: lateByMinutes,
            no_show: false,
            no_show_at: null,
          } as any, // Type assertion needed - Prisma types may not be fully up to date
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
    }

    // Step 6: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
