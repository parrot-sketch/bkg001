/**
 * Use Case: ValidateAppointmentAvailabilityUseCase
 * 
 * Orchestrates validating if a time slot is available for booking.
 * 
 * Business Purpose:
 * - Validates appointment time against doctor availability
 * - Used by scheduling use cases before creating appointments
 * - Prevents booking outside availability windows
 * 
 * Clinical Workflow:
 * This is part of the appointment scheduling workflow:
 * 1. Front desk/doctor selects time slot
 * 2. System validates availability → ValidateAppointmentAvailabilityUseCase (this)
 * 3. If valid, appointment is created
 * 
 * Business Rules:
 * - Doctor must exist
 * - Date must not be in the past
 * - Time must fall within working hours
 * - Time must not conflict with breaks
 * - Time must not conflict with overrides
 * - Time must not conflict with existing appointments
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { AvailabilitySlotService } from '../../domain/services/AvailabilitySlotService';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';
import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';

export interface ValidateAvailabilityDto {
  readonly doctorId: string;
  readonly date: Date;
  readonly time: string; // HH:mm
  readonly duration: number; // minutes
}

export interface ValidateAvailabilityResult {
  readonly isAvailable: boolean;
  readonly reason?: string;
}

export class ValidateAppointmentAvailabilityUseCase {
  constructor(
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly prisma: PrismaClient,
  ) {
    if (!availabilityRepository) {
      throw new Error('AvailabilityRepository is required');
    }
    if (!appointmentRepository) {
      throw new Error('AppointmentRepository is required');
    }
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Executes the validate appointment availability use case
   * 
   * @param dto - ValidateAvailabilityDto with doctor ID, date, time, and duration
   * @returns Promise resolving to ValidateAvailabilityResult
   * @throws DomainException if validation fails
   */
  async execute(dto: ValidateAvailabilityDto): Promise<ValidateAvailabilityResult> {
    // Step 1: Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Validate date is not in the past
    const now = new Date();
    const requestDate = new Date(dto.date);
    requestDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (requestDate < now) {
      return {
        isAvailable: false,
        reason: 'Appointment date cannot be in the past',
      };
    }

    // Step 3: Get doctor availability
    const availability = await this.availabilityRepository.getDoctorAvailability(dto.doctorId);

    if (!availability || availability.workingDays.length === 0) {
      return {
        isAvailable: false,
        reason: 'Doctor has no availability configured',
      };
    }

    // Step 4: Get slot configuration (or use defaults)
    const slotConfig = availability.slotConfiguration || {
      id: '',
      doctorId: dto.doctorId,
      defaultDuration: dto.duration,
      bufferTime: 0,
      slotInterval: 15,
    };

    // Step 5: Get existing appointments for the date
    const doctorAppointments = await this.appointmentRepository.findByDoctor(dto.doctorId);
    const dateAppointments = doctorAppointments.filter((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === requestDate.getTime() &&
        apt.getStatus() !== AppointmentStatus.CANCELLED;
    });

    // Step 6: Get overrides for the date
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);
    const overrides = await this.availabilityRepository.getOverrides(
      dto.doctorId,
      startOfDay,
      endOfDay
    );

    // Step 7: Validate using domain service
    const validation = AvailabilitySlotService.isSlotAvailable(
      requestDate,
      dto.time,
      dto.duration,
      availability.workingDays,
      overrides,
      availability.breaks,
      dateAppointments,
      slotConfig
    );

    return validation;
  }
}
