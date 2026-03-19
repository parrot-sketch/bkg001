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
import { GetAvailableSlotsForDateUseCase } from './GetAvailableSlotsForDateUseCase';
import { DomainException } from '../../domain/exceptions/DomainException';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
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
   * @param userRole - User role (for determining created_by_user_id and source defaults)
   * @returns Promise resolving to AppointmentResponseDto with created appointment data
   * @throws NotFoundError if patient/doctor not found
   * @throws ConflictError if appointment slot is already booked
   * @throws DomainException for other validation failures
   */
  async execute(dto: ScheduleAppointmentDto, userId: string, userRole?: string): Promise<AppointmentResponseDto> {
    // Step 0: Validate required fields
    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required. Please select a surgeon.', {
        doctorId: dto.doctorId,
      });
    }

    // Step 1: Validate patient exists
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new NotFoundError(`Patient with ID ${dto.patientId} not found`, 'Patient', dto.patientId);
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

    // Step 2.5: Validate proposed time availability (Simplified Frontdesk Booking)
    // For frontdesk bookings: Check if proposed time is available
    // - If available: Auto-allocate slot, create appointment
    // - If not available: Create appointment with PENDING_DOCTOR_CONFIRMATION, calculate alternatives
    const slotConfig = await this.availabilityRepository.getSlotConfiguration(dto.doctorId);
    const appointmentDuration = dto.durationMinutes || slotConfig?.defaultDuration || 30;
    
    const appointmentSource = dto.source || AppointmentSource.PATIENT_REQUESTED;
    const isFrontdeskBooking = appointmentSource === AppointmentSource.FRONTDESK_SCHEDULED;
    const isDoctorFollowUp = appointmentSource === AppointmentSource.DOCTOR_FOLLOW_UP;
    
    // Check if proposed time is available
    const availabilityCheck = await this.validateAvailabilityUseCase.execute({
      doctorId: dto.doctorId,
      date: dto.appointmentDate,
      time: dto.time,
      duration: appointmentDuration,
    });

    // For frontdesk bookings and doctor follow-ups: Don't throw error if not available, create appointment anyway
    // - Frontdesk: Doctor will see alternatives and can confirm/customize
    // - Doctor follow-up: Doctor is scheduling their own appointment, so they know their schedule
    // For other sources: Keep existing behavior (throw error if not available)
    if (!availabilityCheck.isAvailable && !isFrontdeskBooking && !isDoctorFollowUp) {
      // Provide helpful error message based on the reason
      let errorMessage = `Appointment time is not available: ${availabilityCheck.reason || 'Slot is already booked'}`;
      
      // If the reason is about no availability configured, provide more helpful guidance
      if (availabilityCheck.reason?.includes('no availability configured')) {
        errorMessage = `Doctor has not configured their availability schedule. Please ask the doctor to set up their working hours in the schedule settings, or contact the administrator.`;
      }
      
      throw new ConflictError(errorMessage);
    }
    
    // For doctor follow-ups: If no availability is configured, show a warning but allow scheduling
    // (Doctor is scheduling their own appointment, so they know their schedule)
    if (isDoctorFollowUp && availabilityCheck.reason?.includes('no availability configured')) {
      console.warn(
        `[ScheduleAppointment] Doctor ${dto.doctorId} is scheduling a follow-up appointment but has no availability configured. ` +
        `Allowing scheduling anyway since doctor is scheduling their own appointment.`
      );
    }

    // Calculate alternative slots if proposed time is not available (for frontdesk bookings)
    let alternativeSlots: Array<{ date: string; time: string }> | undefined;
    if (!availabilityCheck.isAvailable && isFrontdeskBooking) {
      // Get available slots for the same date and nearby dates
      const getSlotsUseCase = new GetAvailableSlotsForDateUseCase(
        this.availabilityRepository,
        this.appointmentRepository,
        this.prisma
      );
      
      // Get slots for the proposed date
      const sameDateSlots = await getSlotsUseCase.execute({
        doctorId: dto.doctorId,
        date: dto.appointmentDate,
        duration: appointmentDuration,
      });
      
      // Filter to only available slots and take first 5
      const availableSameDate = sameDateSlots
        .filter(slot => slot.isAvailable)
        .slice(0, 5)
        .map(slot => ({
          date: dto.appointmentDate.toISOString().split('T')[0],
          time: slot.startTime,
        }));
      
      // If not enough slots on same date, get slots for next 3 days
      if (availableSameDate.length < 3) {
        const nextDays: Date[] = [];
        for (let i = 1; i <= 3; i++) {
          const nextDate = new Date(dto.appointmentDate);
          nextDate.setDate(nextDate.getDate() + i);
          nextDays.push(nextDate);
        }
        
        for (const nextDate of nextDays) {
          if (availableSameDate.length >= 5) break;
          
          const nextDateSlots = await getSlotsUseCase.execute({
            doctorId: dto.doctorId,
            date: nextDate,
            duration: appointmentDuration,
          });
          
          const availableNextDate = nextDateSlots
            .filter(slot => slot.isAvailable)
            .slice(0, 5 - availableSameDate.length)
            .map(slot => ({
              date: nextDate.toISOString().split('T')[0],
              time: slot.startTime,
            }));
          
          availableSameDate.push(...availableNextDate);
        }
      }
      
      alternativeSlots = availableSameDate;
    }

    // Step 3: Create appointment domain entity (validates business rules)
    // Note: ID will be 0 temporarily, database will assign actual ID
    // Status is determined by source:
    //   PATIENT_REQUESTED, FRONTDESK_SCHEDULED, ADMIN_SCHEDULED → PENDING_DOCTOR_CONFIRMATION (requires doctor review)
    //   DOCTOR_FOLLOW_UP → SCHEDULED (auto-confirmed, doctor scheduling their own follow-up)
    // appointmentSource is already defined above (line 141)
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
          throw new ConflictError(
            `Appointment conflict: Doctor already has an appointment on ${dto.appointmentDate.toISOString()} at ${dto.time}`
          );
        }

        // Step 4.2: Check for patient conflicts
        const patientAppointments = await this.appointmentRepository.findByPatient(dto.patientId, tx);
        const excludedStatuses = ['CANCELLED', 'COMPLETED'];
        
        // Normalize appointment date to midnight for date-only comparison
        const appointmentDateOnly = new Date(dto.appointmentDate);
        appointmentDateOnly.setHours(0, 0, 0, 0);
        
        // Check for exact duplicate (same patient, doctor, date, and time)
        const exactDuplicate = patientAppointments.find((apt) => {
          const aptDate = new Date(apt.getAppointmentDate());
          aptDate.setHours(0, 0, 0, 0);
          return (
            aptDate.getTime() === appointmentDateOnly.getTime() &&
            apt.getDoctorId() === dto.doctorId &&
            apt.getTime() === dto.time &&
            !excludedStatuses.includes(apt.getStatus() as string)
          );
        });

        if (exactDuplicate) {
          throw new ConflictError(
            `Appointment conflict: Patient already has an appointment with this doctor on ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}`
          );
        }

        // Check for same patient, same doctor, same day (different time)
        // This prevents scheduling multiple appointments with the same doctor on the same day
        const sameDaySameDoctor = patientAppointments.find((apt) => {
          const aptDate = new Date(apt.getAppointmentDate());
          aptDate.setHours(0, 0, 0, 0);
          return (
            aptDate.getTime() === appointmentDateOnly.getTime() &&
            apt.getDoctorId() === dto.doctorId &&
            !excludedStatuses.includes(apt.getStatus() as string)
          );
        });

        if (sameDaySameDoctor) {
          const existingTime = sameDaySameDoctor.getTime();
          const existingDate = sameDaySameDoctor.getAppointmentDate();
          const formattedDate = existingDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
          throw new ConflictError(
            `This patient already has an appointment with this doctor on ${formattedDate} at ${existingTime}. ` +
            `To avoid scheduling conflicts, please choose a different date or reschedule the existing appointment first.`
          );
        }

        // Check for same patient, same day, different doctors (warn but allow)
        // This is allowed but we'll log it for awareness (e.g., patient seeing multiple specialists)
        const sameDayDifferentDoctor = patientAppointments.filter((apt) => {
          const aptDate = new Date(apt.getAppointmentDate());
          aptDate.setHours(0, 0, 0, 0);
          return (
            aptDate.getTime() === appointmentDateOnly.getTime() &&
            apt.getDoctorId() !== dto.doctorId &&
            !excludedStatuses.includes(apt.getStatus() as string)
          );
        });

        if (sameDayDifferentDoctor.length > 0) {
          // Allow but log for awareness - patient might be seeing multiple specialists
          // This is a valid scenario (e.g., cardiologist in morning, dermatologist in afternoon)
          const otherDoctors = sameDayDifferentDoctor.map(apt => apt.getDoctorId()).join(', ');
          console.info(
            `[ScheduleAppointment] Patient ${dto.patientId} has ${sameDayDifferentDoctor.length} other appointment(s) on ${dto.appointmentDate.toLocaleDateString()} ` +
            `with different doctor(s): ${otherDoctors}. This is allowed (patient may be seeing multiple specialists).`
          );
        }

        // Step 4.3: Save appointment
        const id = await this.appointmentRepository.save(appointment, undefined, tx as PrismaClient);

        // Step 4.4: Save Phase 1 temporal fields
        const appointmentDateWithTime = new Date(dto.appointmentDate);
        const [hours, minutes] = dto.time.split(':').map(Number);
        appointmentDateWithTime.setHours(hours, minutes, 0, 0);

        // Determine created_by_user_id: set for staff roles (FRONTDESK, ADMIN, DOCTOR), null for PATIENT
        const shouldSetCreatedBy = userRole && ['FRONTDESK', 'ADMIN', 'DOCTOR'].includes(userRole);
        const createdByUserId = shouldSetCreatedBy ? userId : null;

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
            // Audit trail: created_by_user_id for staff-created appointments
            created_by_user_id: createdByUserId,
            // Booking channel (UI entry point tracking)
            booking_channel: dto.bookingChannel as any || null,
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
        if (targetArray.some(t => String(t).includes('appointment_no_double_booking') || String(t).includes('unique_doctor_scheduled_slot'))) {
          throw new ConflictError(
            `Appointment conflict: Doctor already has an appointment on ${dto.appointmentDate.toISOString()} at ${dto.time}`
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
    // Send notification for all appointments requiring doctor confirmation
    if (defaultStatus === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      try {
        const doctorUser = await this.prisma.doctor.findUnique({
          where: { id: dto.doctorId },
          select: { user_id: true }
        });

        if (doctorUser) {
          const sourceLabel = appointmentSource === AppointmentSource.FRONTDESK_SCHEDULED
            ? 'Frontdesk has scheduled'
            : appointmentSource === AppointmentSource.ADMIN_SCHEDULED
            ? 'Admin has scheduled'
            : 'Patient has requested';
          
          await this.notificationService.sendInApp(
            doctorUser.user_id,
            'Appointment Requires Confirmation',
            `${sourceLabel} an appointment for ${patient.getFullName()} on ${dto.appointmentDate.toLocaleDateString()} at ${dto.time}. Please confirm, cancel, or reschedule.`,
            'warning',
            {
              event: 'APPOINTMENT_PENDING_CONFIRMATION',
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
    const responseDto = ApplicationAppointmentMapper.toResponseDto(savedAppointment);
    
    // Add slot allocation metadata for frontdesk bookings
    if (isFrontdeskBooking) {
      (responseDto as any).slotAllocation = {
        autoAllocated: availabilityCheck.isAvailable,
        proposedTimeAvailable: availabilityCheck.isAvailable,
        alternativeSlots: alternativeSlots,
      };
    }
    
    return responseDto;
  }
}
