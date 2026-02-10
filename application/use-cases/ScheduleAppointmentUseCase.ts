import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus, getDefaultStatusForSource } from '../../domain/enums/AppointmentStatus';
import { AppointmentSource } from '../../domain/enums/AppointmentSource';
import { ScheduleAppointmentDto } from '../dtos/ScheduleAppointmentDto';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { AppointmentMapper as ApplicationAppointmentMapper } from '../mappers/AppointmentMapper';
import { ValidateAppointmentAvailabilityUseCase } from './ValidateAppointmentAvailabilityUseCase';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient, Prisma } from '@prisma/client';
import { UseCaseFactory } from '@/lib/use-case-factory';

/**
 * Use Case: ScheduleAppointmentUseCase
 * 
 * Orchestrates the scheduling of a new appointment between a patient and doctor.
 * 
 * Business Purpose:
 * - Validates appointment availability (no double booking)
 * - Ensures patient and doctor exist
 * - Creates appointment record with PENDING status
 * - Sends notification to patient
 * - Records audit event
 * 
 * Clinical Workflow:
 * This use case is part of the appointment scheduling workflow:
 * 1. Patient registration → CreatePatientUseCase
 * 2. Appointment scheduling → ScheduleAppointmentUseCase (this)
 * 3. Check-in → CheckInPatientUseCase
 * 4. Consultation → StartConsultationUseCase → CompleteConsultationUseCase
 * 
 * Business Rules:
 * - Patient must exist
 * - Doctor must exist (validated by repository)
 * - Appointment date cannot be in the past
 * - No double booking (same doctor, same date/time)
 * - Appointment starts with PENDING status
 */
export class ScheduleAppointmentUseCase {
  private readonly validateAvailabilityUseCase: ValidateAppointmentAvailabilityUseCase;

  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    private readonly timeService: ITimeService,
    private readonly prisma: PrismaClient,
  ) {
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!patientRepository) {
      throw new Error('PatientRepository is required');
    }
    if (!availabilityRepository) {
      throw new Error('AvailabilityRepository is required');
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
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }

    // CRITICAL: Validate that we're using the singleton PrismaClient
    // This prevents connection pool exhaustion from accidental new instances
    UseCaseFactory.validatePrismaClient(prisma);

    // Initialize availability validation use case
    this.validateAvailabilityUseCase = new ValidateAppointmentAvailabilityUseCase(
      availabilityRepository,
      appointmentRepository,
      prisma,
    );
  }

  /**
   * Executes the appointment scheduling use case
   * 
   * @param dto - ScheduleAppointmentDto with appointment scheduling data
   * @param userId - User ID performing the action (for audit purposes)
   * @returns Promise resolving to AppointmentResponseDto with created appointment data
   * @throws DomainException if validation fails or appointment conflicts exist
   */
  async execute(dto: ScheduleAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 0: Validate required fields
    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required. Please select a surgeon.', {
        doctorId: dto.doctorId,
      });
    }

    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new DomainException(`Patient with ID ${dto.patientId} not found`, {
        patientId: dto.patientId,
      });
    }

    // Step 2: Validate appointment date is not in the past
    // Step 2: Validate appointment date is not in the past
    const now = this.timeService.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const appointmentDateTime = new Date(dto.appointmentDate);
    appointmentDateTime.setHours(0, 0, 0, 0);

    if (appointmentDateTime < today) {
      throw new DomainException('Appointment date cannot be in the past', {
        appointmentDate: dto.appointmentDate,
        currentDate: today,
      });
    }

    // Step 2.5: Validate availability (Phase 3 Enhancement)
    // Uses Phase 1 temporal fields for efficient conflict detection
    // Leverages indexes on (doctor_id, scheduled_at) for O(n) performance
    const slotConfig = await this.availabilityRepository.getSlotConfiguration(dto.doctorId);
    const appointmentDuration = slotConfig?.defaultDuration || 30; // Default 30 minutes

    // PHASE 1 INTEGRATION: appointmentDuration stored as Phase 1 field (duration_minutes)
    // This enables quick conflict detection without joins
    const availabilityCheck = await this.validateAvailabilityUseCase.execute({
      doctorId: dto.doctorId,
      date: dto.appointmentDate,
      time: dto.time,
      duration: appointmentDuration, // Maps to Phase 1: duration_minutes field
    });

    if (!availabilityCheck.isAvailable) {
      throw new DomainException(
        `Appointment time is not available: ${availabilityCheck.reason}`,
        {
          doctorId: dto.doctorId,
          date: dto.appointmentDate,
          time: dto.time,
          reason: availabilityCheck.reason,
        }
      );
    }

    // Step 3: Create appointment domain entity (validates business rules)
    // Note: ID will be 0 temporarily, database will assign actual ID
    // Status is determined by source:
    //   PATIENT_REQUESTED → PENDING_DOCTOR_CONFIRMATION (requires doctor review)
    //   FRONTDESK_SCHEDULED, DOCTOR_FOLLOW_UP, ADMIN_SCHEDULED → SCHEDULED (auto-confirmed)
    const appointmentSource = dto.source || AppointmentSource.PATIENT_REQUESTED;
    const defaultStatus = getDefaultStatusForSource(appointmentSource);

    const appointment = ApplicationAppointmentMapper.fromScheduleDto(
      dto,
      defaultStatus,
      0, // Temporary ID, will be replaced after save
    );

    // Step 4: Save appointment within transaction to prevent race conditions
    // CRITICAL: This transaction ensures atomic conflict check + save operation
    // Even if two requests arrive simultaneously, only one will succeed
    // The database unique index (appointment_no_double_booking) provides additional protection
    let savedAppointmentId: number;

    try {
      savedAppointmentId = await this.prisma.$transaction(async (tx) => {
        // Step 4.1: Check for doctor conflict within transaction
        const hasDoctorConflict = await this.appointmentRepository.hasConflict(
          dto.doctorId,
          appointmentDateTime,
          dto.time,
          tx as PrismaClient
        );

        if (hasDoctorConflict) {
          throw new DomainException(
            `Appointment conflict: Doctor ${dto.doctorId} already has an appointment on ${dto.appointmentDate.toISOString()} at ${dto.time}`,
            {
              doctorId: dto.doctorId,
              appointmentDate: dto.appointmentDate,
              time: dto.time,
            },
          );
        }

        // Step 4.2: Check for patient conflict
        const patientAppointments = await this.appointmentRepository.findByPatient(dto.patientId, tx);
        const excludedStatuses = ['CANCELLED', 'COMPLETED'];
        const patientConflict = patientAppointments.find((apt) => {
          const aptDate = new Date(apt.getAppointmentDate());
          aptDate.setHours(0, 0, 0, 0);
          return (
            aptDate.getTime() === appointmentDateTime.getTime() &&
            apt.getDoctorId() === dto.doctorId &&
            apt.getTime() === dto.time &&
            !excludedStatuses.includes(apt.getStatus() as string)
          );
        });

        if (patientConflict) {
          throw new DomainException(
            `Appointment conflict: Patient already has an appointment with doctor ${dto.doctorId} on ${dto.appointmentDate.toISOString()} at ${dto.time}`,
            {
              patientId: dto.patientId,
              doctorId: dto.doctorId,
              appointmentDate: dto.appointmentDate,
              time: dto.time,
            },
          );
        }

        // Step 4.3: Save appointment
        const id = await this.appointmentRepository.save(appointment, undefined, tx as PrismaClient);

        // Step 4.4: Save Phase 1 temporal fields
        const appointmentDateWithTime = new Date(dto.appointmentDate);
        const [hours, minutes] = dto.time.split(':').map(Number);
        appointmentDateWithTime.setHours(hours, minutes, 0, 0);

        await tx.appointment.update({
          where: { id: id },
          data: {
            slot_start_time: dto.time,
            slot_duration: appointmentDuration,
            scheduled_at: appointmentDateWithTime,
            duration_minutes: appointmentDuration,
            status_changed_at: new Date(),
            status_changed_by: userId,
            // Source tracking
            source: appointmentSource as any,
            parent_appointment_id: dto.parentAppointmentId || null,
            parent_consultation_id: dto.parentConsultationId || null,
            // Auto-confirm for non-patient sources
            ...(defaultStatus === AppointmentStatus.SCHEDULED ? {
              doctor_confirmed_at: new Date(),
              doctor_confirmed_by: userId,
            } : {}),
          },
        });

        return id;
      }, { timeout: 15000 });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        throw error;
      }

      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        const targetArray = Array.isArray(target) ? target : (typeof target === 'string' ? [target] : []);
        if (targetArray.some(t => String(t).includes('appointment_no_double_booking'))) {
          throw new DomainException(
            `Appointment conflict: Doctor ${dto.doctorId} already has an appointment on ${dto.appointmentDate.toISOString()} at ${dto.time}`,
            {
              doctorId: dto.doctorId,
              appointmentDate: dto.appointmentDate,
              time: dto.time,
              error: 'Database constraint violation',
            },
          );
        }
      }

      throw error;
    }

    // Step 5: Retrieve saved appointment to get the full entity
    // Use the ID returned from the save operation
    const savedAppointment = await this.appointmentRepository.findById(savedAppointmentId);

    if (!savedAppointment) {
      throw new Error(`Failed to retrieve saved appointment with ID ${savedAppointmentId}`);
    }

    // Step 6: Send notification to patient
    try {
      await this.notificationService.sendEmail(
        patient.getEmail(),
        'Appointment Scheduled',
        `Your appointment has been scheduled for ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}.`,
      );
    } catch (error) {
      // Notification failure should not break the use case
      // Log error but continue
      console.error('Failed to send appointment notification:', error);
    }

    // Step 7: Send in-app notification to Doctor for confirmation
    // Only send "needs confirmation" for patient-requested appointments
    if (defaultStatus === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      try {
        const doctorUser = await this.prisma.doctor.findUnique({
          where: { id: dto.doctorId },
          select: { user_id: true }
        });

        if (doctorUser) {
          await this.notificationService.sendInApp(
            doctorUser.user_id,
            'New Appointment Request',
            `${patient.getFullName()} has been booked for ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}. Please confirm or reschedule.`,
            'warning',
            {
              resourceType: 'appointment',
              resourceId: savedAppointmentId,
              actionUrl: `/doctor/appointments/${savedAppointmentId}`
            }
          );
        }
      } catch (error) {
        console.error('Failed to send doctor notification:', error);
      }
    }

    // Step 8: Record audit event
    const sourceLabel = appointmentSource === AppointmentSource.DOCTOR_FOLLOW_UP
      ? ' (doctor follow-up)' : appointmentSource === AppointmentSource.FRONTDESK_SCHEDULED
      ? ' (frontdesk)' : '';
    await this.auditService.recordEvent({
      userId,
      recordId: savedAppointment.getId().toString(),
      action: 'CREATE',
      model: 'Appointment',
      details: `Scheduled appointment${sourceLabel} for patient ${patient.getFullName()} with doctor ${dto.doctorId} on ${dto.appointmentDate.toISOString()} [status: ${defaultStatus}, source: ${appointmentSource}]`,
    });

    // Step 9: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(savedAppointment);
  }
}
