import { PrismaClient, Prisma } from '@prisma/client';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
import { AppointmentSource } from '../../domain/enums/AppointmentSource';
import { BookingChannel } from '../../domain/enums/BookingChannel';
import { DomainException } from '../../domain/exceptions/DomainException';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { Role } from '../../domain/enums/Role';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { PAST_VISIT_MAX_DAYS, type RecordPastVisitRequest } from '../dtos/RecordPastVisitRequest';
import { UseCaseFactory } from '@/lib/use-case-factory';

const DEFAULT_DURATION_MINUTES = 30;

/**
 * Records a visit that already happened but was never entered into the system.
 *
 * Frontdesk/Admin only. Creates a COMPLETED appointment within the last N days,
 * skips doctor confirmation and live queue, and does not create billing.
 */
export class RecordPastVisitUseCase {
  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: IAuditService,
    private readonly timeService: ITimeService,
    private readonly prisma: PrismaClient,
  ) {
    if (!patientRepository) throw new Error('PatientRepository is required');
    if (!auditService) throw new Error('AuditService is required');
    if (!timeService) throw new Error('TimeService is required');
    if (!prisma) throw new Error('PrismaClient is required');
    UseCaseFactory.validatePrismaClient(prisma);
  }

  async execute(
    dto: RecordPastVisitRequest,
    userId: string,
    userRole: string,
  ): Promise<AppointmentResponseDto> {
    if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only front desk or admin can record past visits');
    }

    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new NotFoundError(`Patient with ID ${dto.patientId} not found`, 'Patient', dto.patientId);
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      select: { id: true, name: true, specialization: true },
    });
    if (!doctor) {
      throw new NotFoundError(`Doctor with ID ${dto.doctorId} not found`, 'Doctor', dto.doctorId);
    }

    const now = this.timeService.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const visitDate = new Date(dto.appointmentDate);
    visitDate.setHours(0, 0, 0, 0);

    if (visitDate.getTime() >= today.getTime()) {
      throw new DomainException(
        'Past visits must be dated before today. Use New Appointment or Add to Queue for today.',
        { appointmentDate: dto.appointmentDate },
      );
    }

    const earliest = new Date(today);
    earliest.setDate(earliest.getDate() - PAST_VISIT_MAX_DAYS);
    if (visitDate.getTime() < earliest.getTime()) {
      throw new DomainException(
        `Past visits can only be recorded for the last ${PAST_VISIT_MAX_DAYS} days.`,
        { appointmentDate: dto.appointmentDate, earliestAllowed: earliest },
      );
    }

    const [hours, minutes] = dto.time.split(':').map(Number);
    const scheduledAt = new Date(visitDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const duration = dto.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const scheduledEndAt = new Date(scheduledAt.getTime() + duration * 60_000);

    const lateNote = dto.lateEntryNote.trim();
    const composedNote = `[Late entry] ${lateNote}`;

    // Block if anything already exists that day for this patient+doctor (except cancelled/no-show)
    const existingSameDay = await this.prisma.appointment.findFirst({
      where: {
        patient_id: dto.patientId,
        doctor_id: dto.doctorId,
        appointment_date: visitDate,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      },
      select: { id: true, status: true, time: true },
    });

    if (existingSameDay) {
      if (existingSameDay.status === AppointmentStatus.COMPLETED) {
        throw new ConflictError(
          `This patient already has a completed visit with this doctor on that day (${existingSameDay.time}). Open appointment #${existingSameDay.id} instead of recording again.`,
        );
      }
      throw new ConflictError(
        `An appointment already exists for this patient and doctor on that day (#${existingSameDay.id}, ${existingSameDay.status} at ${existingSameDay.time}). Open that record and continue the workflow instead of creating a late entry.`,
      );
    }

    // Avoid colliding with a slot that already holds the doctor's time
    const slotHeld = await this.prisma.appointment.findFirst({
      where: {
        doctor_id: dto.doctorId,
        scheduled_at: scheduledAt,
        status: {
          notIn: [
            AppointmentStatus.PENDING,
            AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
          ],
        },
      },
      select: { id: true, status: true },
    });

    if (slotHeld) {
      throw new ConflictError(
        `That doctor already has an appointment at ${dto.time} on that day (#${slotHeld.id}). Choose a different time or open the existing appointment.`,
      );
    }

    let created;
    try {
      created = await this.prisma.appointment.create({
        data: {
          patient_id: dto.patientId,
          doctor_id: dto.doctorId,
          appointment_date: visitDate,
          time: dto.time,
          type: dto.type.trim(),
          status: AppointmentStatus.COMPLETED,
          source: AppointmentSource.FRONTDESK_SCHEDULED,
          booking_channel: BookingChannel.DASHBOARD,
          reason: lateNote,
          note: composedNote,
          created_by_user_id: userId,
          scheduled_at: scheduledAt,
          scheduled_end_at: scheduledEndAt,
          slot_start_time: dto.time,
          slot_duration: duration,
          duration_minutes: duration,
          checked_in_at: scheduledAt,
          checked_in_by: userId,
          consultation_started_at: scheduledAt,
          consultation_ended_at: scheduledEndAt,
          consultation_duration: duration,
          doctor_confirmed_at: scheduledAt,
          doctor_confirmed_by: userId,
          status_changed_at: now,
          status_changed_by: userId,
        },
        include: {
          patient: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              file_number: true,
            },
          },
          doctor: {
            select: { id: true, name: true, specialization: true },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError(
          `That doctor already has an appointment at ${dto.time} on that day. Choose a different time.`,
        );
      }
      throw error;
    }

    await this.auditService.recordEvent({
      userId,
      recordId: String(created.id),
      action: 'CREATE',
      model: 'Appointment',
      details: `Late entry: recorded past visit as COMPLETED for ${dto.appointmentDate.toISOString().slice(0, 10)} at ${dto.time}. Note: ${lateNote}`,
    });

    return {
      id: created.id,
      patientId: created.patient_id,
      doctorId: created.doctor_id,
      appointmentDate: created.appointment_date,
      time: created.time,
      status: created.status,
      type: created.type,
      note: created.note ?? undefined,
      reason: created.reason ?? undefined,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      checkedInAt: created.checked_in_at ?? undefined,
      checkedInBy: created.checked_in_by ?? undefined,
      consultationStartedAt: created.consultation_started_at ?? undefined,
      consultationEndedAt: created.consultation_ended_at ?? undefined,
      consultationDuration: created.consultation_duration ?? undefined,
      patient: created.patient
        ? {
            id: created.patient.id,
            firstName: created.patient.first_name,
            lastName: created.patient.last_name,
            email: created.patient.email ?? undefined,
            phone: created.patient.phone ?? undefined,
            fileNumber: created.patient.file_number ?? undefined,
          }
        : undefined,
      doctor: created.doctor
        ? {
            id: created.doctor.id,
            name: created.doctor.name,
            specialization: created.doctor.specialization ?? undefined,
          }
        : undefined,
    };
  }
}
