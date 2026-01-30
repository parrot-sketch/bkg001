/**
 * Use Case: GetAvailableSlotsForDateUseCase
 * 
 * Orchestrates getting available time slots for a doctor on a specific date.
 * 
 * Business Purpose:
 * - Front desk can query available slots for scheduling
 * - Doctors can view their own available slots
 * - Used in scheduling UI to show bookable times
 * 
 * Clinical Workflow:
 * This is part of the appointment scheduling workflow:
 * 1. Front desk selects doctor and date
 * 2. System queries available slots → GetAvailableSlotsForDateUseCase (this)
 * 3. Front desk selects slot and schedules appointment
 * 
 * Business Rules:
 * - Doctor must exist
 * - Date must be valid (not in past)
 * - Slots generated from working days, excluding breaks, overrides, existing appointments
 * - Only available slots returned
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { IAppointmentRepository } from '../../domain/interfaces/repositories/IAppointmentRepository';
import { GetAvailableSlotsDto } from '../dtos/GetAvailableSlotsDto';
import { AvailableSlotResponseDto } from '../dtos/AvailableSlotResponseDto';
import { AvailabilityService } from '../../domain/services/AvailabilityService';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

export class GetAvailableSlotsForDateUseCase {
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
   * Executes the get available slots use case
   * 
   * @param dto - GetAvailableSlotsDto with doctor ID, date, and optional duration
   * @returns Promise resolving to array of available slots
   * @throws DomainException if validation fails
   */
  async execute(dto: GetAvailableSlotsDto): Promise<AvailableSlotResponseDto[]> {
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
      throw new DomainException('Cannot get slots for past dates', {
        date: dto.date,
      });
    }

    // Step 3: Get doctor availability
    const availability = await this.availabilityRepository.getDoctorAvailability(dto.doctorId);

    if (!availability) {
      return []; // No availability configured
    }

    // Step 4: Get slot configuration (or use defaults)
    const slotConfig = availability.slotConfiguration || {
      id: '',
      doctorId: dto.doctorId,
      defaultDuration: dto.duration || 30,
      bufferTime: 0,
      slotInterval: 15,
    };

    // Override duration if specified in DTO
    if (dto.duration) {
      slotConfig.defaultDuration = dto.duration;
    }

    // Step 5: Get existing appointments for the date (optimized: fetch only for this date)
    // Use date range filter to fetch only appointments for the specific date
    const startOfRequestDate = new Date(requestDate);
    startOfRequestDate.setHours(0, 0, 0, 0);
    const endOfRequestDate = new Date(requestDate);
    endOfRequestDate.setHours(23, 59, 59, 999);

    const doctorAppointments = await this.appointmentRepository.findByDoctor(dto.doctorId, {
      startDate: startOfRequestDate,
      endDate: endOfRequestDate,
    });

    // Filter to only active appointments that occupy time slots for the exact date
    // Exclude: CANCELLED, COMPLETED (these don't block slots)
    // Include: PENDING, SCHEDULED (these block slots)
    // Note: Prisma enum only has PENDING, SCHEDULED, CANCELLED, COMPLETED (no NO_SHOW or CONFIRMED)
    const excludedStatuses = ['CANCELLED', 'COMPLETED'];
    const dateAppointments = doctorAppointments.filter((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0);
      const requestDateNormalized = new Date(requestDate);
      requestDateNormalized.setHours(0, 0, 0, 0);
      return aptDate.getTime() === requestDateNormalized.getTime() &&
        !excludedStatuses.includes(apt.getStatus() as string);
    });

    // Step 6: Get overrides and blocks for the date
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);
    const [overrides, blocks] = await Promise.all([
      this.availabilityRepository.getOverrides(
        dto.doctorId,
        startOfDay,
        endOfDay
      ),
      this.availabilityRepository.getBlocks(
        dto.doctorId,
        startOfDay,
        endOfDay
      ),
    ]);

    // Step 7: Use AvailabilityService to get available slots (enterprise scheduling with layered resolution)
    // This service handles: Blocks > Overrides > Sessions > Breaks
    const slots = AvailabilityService.getAvailableSlots(
      requestDate,
      availability.workingDays,
      availability.sessions,
      overrides,
      blocks,
      availability.breaks,
      dateAppointments,
      slotConfig
    );

    // Step 8: Map to DTOs (preserving isAvailable flag from AvailabilityService)
    return slots.map((slot) => ({
      startTime: this.formatTime(slot.startTime),
      endTime: this.formatTime(slot.endTime),
      duration: slot.duration,
      isAvailable: slot.isAvailable,
    }));
  }

  /**
   * Efficiently gets all dates with available slots within a range
   * 
   * Optimization: Performs a single bulk fetch for all data (appointments, blocks, overrides)
   * instead of querying the database for each day individually.
   */
  async getAvailableDates(doctorId: string, startDate: Date, endDate: Date): Promise<string[]> {
    // 1. Validate doctor exists (once)
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${doctorId} not found`);
    }

    // 2. Validate date range
    if (startDate > endDate) {
      throw new DomainException('Start date cannot be after end date');
    }

    // 3. Bulk fetch availability config (once)
    const availability = await this.availabilityRepository.getDoctorAvailability(doctorId);
    if (!availability) {
      return [];
    }

    // 4. Bulk fetch all appointments for the entire range (once)
    // Normalize to start/end of day to capture everything
    const searchStart = new Date(startDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(endDate);
    searchEnd.setHours(23, 59, 59, 999);

    const allAppointments = await this.appointmentRepository.findByDoctor(doctorId, {
      startDate: searchStart,
      endDate: searchEnd,
    });

    // 5. Bulk fetch all overrides and blocks for the entire range (once)
    const [allOverrides, allBlocks] = await Promise.all([
      this.availabilityRepository.getOverrides(doctorId, searchStart, searchEnd),
      this.availabilityRepository.getBlocks(doctorId, searchStart, searchEnd),
    ]);

    // 6. Process each day in memory
    const availableDates: string[] = [];
    const currentDate = new Date(searchStart);
    const excludedStatuses = ['CANCELLED', 'COMPLETED'];

    // Default slot config if missing
    const slotConfig = availability.slotConfiguration || {
      id: '',
      doctorId: doctorId,
      defaultDuration: 30, // Default to 30 mins if not configured
      bufferTime: 0,
      slotInterval: 15,
    };

    while (currentDate <= searchEnd) {
      // In-memory filter for this day's appointments
      // Much faster than DB query per day
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAppointments = allAppointments.filter((apt) => {
        const aptDate = new Date(apt.getAppointmentDate());
        return aptDate >= dayStart &&
          aptDate <= dayEnd &&
          !excludedStatuses.includes(apt.getStatus() as string);
      });

      // In-memory filter for overrides and blocks
      const dayOverrides = allOverrides.filter(o =>
        (o.startDate <= dayEnd && o.endDate >= dayStart)
      );

      const dayBlocks = allBlocks.filter(b =>
        (b.startDate <= dayEnd && b.endDate >= dayStart)
      );

      // Check availability using the service logic
      try {
        const slots = AvailabilityService.getAvailableSlots(
          new Date(currentDate),
          availability.workingDays,
          availability.sessions,
          dayOverrides,
          dayBlocks,
          availability.breaks,
          dayAppointments,
          slotConfig
        );

        if (slots.length > 0) {
          availableDates.push(currentDate.toISOString().split('T')[0]);
        }
      } catch (e) {
        // Skip errors for individual days
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableDates;
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
