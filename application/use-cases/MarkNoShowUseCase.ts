import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { MarkNoShowDto } from '../dtos/MarkNoShowDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import db from '@/lib/db';

/**
 * Use Case: MarkNoShowUseCase
 * 
 * Orchestrates marking an appointment as a no-show.
 * 
 * Business Purpose:
 * - Marks appointment as no-show (patient didn't arrive)
 * - Records reason and notes for the no-show
 * - Updates appointment status appropriately
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the appointment management workflow:
 * 1. Appointment confirmed → Patient confirms appointment
 * 2. Appointment day → Patient expected to arrive
 * 3. No-show detection → MarkNoShowUseCase (this)
 * 4. Follow-up → May reschedule or cancel
 * 
 * Business Rules:
 * - Appointment must exist
 * - Appointment must not be already completed or cancelled
 * - Can mark as no-show if appointment time has passed and patient hasn't checked in
 * - Must provide reason for no-show
 * - Audit trail required for all no-show markings
 */
export class MarkNoShowUseCase {
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
   * Executes the mark no-show use case
   * 
   * @param dto - MarkNoShowDto with appointment ID, reason, and optional notes
   * @returns Promise resolving to AppointmentResponseDto with updated appointment data
   * @throws DomainException if appointment not found or cannot be marked as no-show
   */
  async execute(dto: MarkNoShowDto): Promise<AppointmentResponseDto> {
    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);

    if (!appointment) {
      throw new DomainException(`Appointment with ID ${dto.appointmentId} not found`, {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 2: Validate appointment can be marked as no-show
    if (appointment.getStatus() === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot mark a cancelled appointment as no-show', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    if (appointment.getStatus() === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot mark a completed appointment as no-show', {
        appointmentId: dto.appointmentId,
        status: appointment.getStatus(),
      });
    }

    // Step 3: Validate no-show reason is provided
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new DomainException('No-show reason is required', {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 4: Check if patient has already checked in
    const prismaAppointment = await (db.appointment.findUnique as any)({
      where: { id: dto.appointmentId },
      select: { checked_in_at: true, no_show: true },
    }) as { checked_in_at: Date | null; no_show: boolean } | null;

    if (prismaAppointment?.checked_in_at) {
      throw new DomainException('Cannot mark appointment as no-show: patient has already checked in', {
        appointmentId: dto.appointmentId,
        checkedInAt: prismaAppointment.checked_in_at,
      });
    }

    if (prismaAppointment?.no_show) {
      throw new DomainException('Appointment is already marked as no-show', {
        appointmentId: dto.appointmentId,
      });
    }

    // Step 5: Update appointment with no-show information via Prisma
    // (These fields are not part of domain entity but needed for workflow)
    const now = this.timeService.now();
    await db.appointment.update({
      where: { id: dto.appointmentId },
      data: {
        no_show: true,
        no_show_at: now,
        no_show_reason: dto.reason.trim(),
        no_show_notes: dto.notes?.trim() || null,
      } as any, // Type assertion needed - Prisma types may not be fully up to date
    });

    // Step 6: Update appointment note with no-show information
    const existingNote = appointment.getNote() || '';
    const noShowNote = `[No-Show] Reason: ${dto.reason}${dto.notes ? `\nNotes: ${dto.notes}` : ''}`;
    const updatedNote = existingNote 
      ? `${existingNote}\n\n${noShowNote}`
      : noShowNote;
    
    const updatedAppointment = ApplicationAppointmentMapper.updateNote(
      appointment,
      updatedNote,
    );

    await this.appointmentRepository.update(updatedAppointment);

    // Step 7: Record audit event
    await this.auditService.recordEvent({
      userId: dto.userId,
      recordId: appointment.getId().toString(),
      action: 'UPDATE',
      model: 'Appointment',
      details: `Appointment ${dto.appointmentId} marked as no-show. Reason: ${dto.reason}. ${dto.notes ? `Notes: ${dto.notes}` : ''}`,
    });

    // Step 8: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(updatedAppointment);
  }
}
