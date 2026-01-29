/**
 * Use Case: GetAvailabilityForRangeUseCase
 * 
 * Orchestrates getting availability calendar for a date range.
 * 
 * Business Purpose:
 * - Front desk can view which dates have availability
 * - Doctors can view their availability calendar
 * - Used in calendar UI to highlight available dates
 * 
 * Clinical Workflow:
 * This is part of the appointment scheduling workflow:
 * 1. User selects date range
 * 2. System queries availability calendar → GetAvailabilityForRangeUseCase (this)
 * 3. UI highlights dates with availability
 * 
 * Business Rules:
 * - Doctor must exist
 * - Date range must be valid (not in past, reasonable size)
 * - Returns dates with at least one available slot
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { AvailabilityService, AvailabilityCalendarDay } from '../../domain/services/AvailabilityService';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

export interface GetAvailabilityForRangeDto {
  readonly doctorId: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

export class GetAvailabilityForRangeUseCase {
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
   * Executes the get availability for range use case
   * 
   * @param dto - GetAvailabilityForRangeDto with doctor ID and date range
   * @returns Promise resolving to availability calendar
   * @throws DomainException if validation fails
   */
  async execute(dto: GetAvailabilityForRangeDto): Promise<AvailabilityCalendarDay[]> {
    // Step 1: Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Validate date range
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new DomainException('Invalid date format', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    if (startDate > endDate) {
      throw new DomainException('Start date must be before or equal to end date', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    // Step 3: Validate date range is not in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (startDate < now) {
      throw new DomainException('Start date cannot be in the past', {
        startDate: dto.startDate,
      });
    }

    // Step 4: Validate date range is reasonable (max 90 days)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new DomainException('Date range cannot exceed 90 days', {
        daysDiff,
      });
    }

    // Step 5: Get doctor availability
    const availability = await this.availabilityRepository.getDoctorAvailability(dto.doctorId);

    if (!availability) {
      return []; // No availability configured
    }

    // Step 6: Get slot configuration (or use defaults)
    const slotConfig = availability.slotConfiguration || {
      id: '',
      doctorId: dto.doctorId,
      defaultDuration: 30,
      bufferTime: 0,
      slotInterval: 15,
    };

    // Step 7: Get existing appointments for the date range
    const appointments = await this.appointmentRepository.findByDoctor(dto.doctorId, {
      startDate,
      endDate,
    });

    // Step 8: Get overrides and blocks for the date range
    const [overrides, blocks] = await Promise.all([
      this.availabilityRepository.getOverrides(dto.doctorId, startDate, endDate),
      this.availabilityRepository.getBlocks(dto.doctorId, startDate, endDate),
    ]);

    // Step 9: Use AvailabilityService to get calendar (delegates all computation to domain service)
    const calendar = AvailabilityService.getAvailabilityCalendar(
      startDate,
      endDate,
      availability.workingDays,
      availability.sessions,
      overrides,
      blocks,
      availability.breaks,
      appointments,
      slotConfig
    );

    return calendar;
  }
}
