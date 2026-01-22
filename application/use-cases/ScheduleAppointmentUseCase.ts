import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { ITimeService } from '../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../domain/entities/Appointment';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';
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
    const now = this.timeService.now();
    const appointmentDateTime = new Date(dto.appointmentDate);
    appointmentDateTime.setHours(0, 0, 0, 0);
    
    if (appointmentDateTime < now) {
      throw new DomainException('Appointment date cannot be in the past', {
        appointmentDate: dto.appointmentDate,
        currentDate: now,
      });
    }

    // Step 2.5: Validate availability (NEW - critical for clinic operations)
    // Get slot configuration to determine duration
    const slotConfig = await this.availabilityRepository.getSlotConfiguration(dto.doctorId);
    const appointmentDuration = slotConfig?.defaultDuration || 30; // Default 30 minutes

    const availabilityCheck = await this.validateAvailabilityUseCase.execute({
      doctorId: dto.doctorId,
      date: dto.appointmentDate,
      time: dto.time,
      duration: appointmentDuration,
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
    const appointment = ApplicationAppointmentMapper.fromScheduleDto(
      dto,
      AppointmentStatus.PENDING,
      0, // Temporary ID, will be replaced after save
    );

    // Step 4: Save appointment within transaction to prevent race conditions
    // CRITICAL: This transaction ensures atomic conflict check + save operation
    // Even if two requests arrive simultaneously, only one will succeed
    // The database unique index (appointment_no_double_booking) provides additional protection
    let savedAppointmentId: number;
    
    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 4.1: Check for doctor conflict within transaction
        // This is the critical check - must happen inside transaction
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

        // Step 4.2: Check for patient conflict (same doctor/date/time)
        // This prevents patient from booking same slot twice
        const patientAppointments = await this.appointmentRepository.findByPatient(dto.patientId);
        const patientConflict = patientAppointments.find((apt) => {
          const aptDate = new Date(apt.getAppointmentDate());
          aptDate.setHours(0, 0, 0, 0);
          return (
            aptDate.getTime() === appointmentDateTime.getTime() &&
            apt.getDoctorId() === dto.doctorId &&
            apt.getTime() === dto.time &&
            apt.getStatus() !== AppointmentStatus.CANCELLED
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

        // Step 4.3: Save appointment within same transaction
        // If unique constraint violation occurs (from DB index), it will be caught
        await this.appointmentRepository.save(appointment, undefined, tx as PrismaClient);

        // Step 4.4: Retrieve the saved appointment ID within transaction
        // We need to find the appointment we just created to get its ID
        const savedAppointment = await tx.appointment.findFirst({
          where: {
            patient_id: dto.patientId,
            doctor_id: dto.doctorId,
            appointment_date: appointmentDateTime,
            time: dto.time,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        if (!savedAppointment) {
          throw new Error('Failed to retrieve saved appointment ID');
        }

        savedAppointmentId = savedAppointment.id;

        // Step 4.5: Save slot information within same transaction
        await tx.appointment.update({
          where: { id: savedAppointmentId },
          data: {
            slot_start_time: dto.time,
            slot_duration: appointmentDuration,
          },
        });
      });
    } catch (error) {
      // Handle domain exceptions (re-throw as-is)
      if (error instanceof DomainException) {
        throw error;
      }
      
      // Handle Prisma unique constraint violations (double booking)
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
      
      // Re-throw other errors
      throw error;
    }

    // Step 5: Retrieve saved appointment to get the full entity
    // Note: savedAppointmentId was set within the transaction above
    const allPatientAppointments = await this.appointmentRepository.findByPatient(dto.patientId);
    let savedAppointment = allPatientAppointments
      .filter((apt) => apt.getId() === savedAppointmentId)
      .find((apt) => apt.getDoctorId() === dto.doctorId && apt.getAppointmentDate().getTime() === appointmentDateTime.getTime());

    if (!savedAppointment) {
      // Fallback: find by criteria if ID match didn't work
      savedAppointment = allPatientAppointments
        .filter((apt) => apt.getDoctorId() === dto.doctorId && apt.getAppointmentDate().getTime() === appointmentDateTime.getTime())
        .sort((a, b) => (b.getCreatedAt()?.getTime() || 0) - (a.getCreatedAt()?.getTime() || 0))[0];
      
      if (!savedAppointment) {
        throw new Error('Failed to retrieve saved appointment');
      }
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

    // Step 8: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: savedAppointment.getId().toString(),
      action: 'CREATE',
      model: 'Appointment',
      details: `Scheduled appointment for patient ${patient.getFullName()} with doctor ${dto.doctorId} on ${dto.appointmentDate.toISOString()}`,
    });

    // Step 9: Map domain entity to response DTO
    return ApplicationAppointmentMapper.toResponseDto(savedAppointment);
  }
}
