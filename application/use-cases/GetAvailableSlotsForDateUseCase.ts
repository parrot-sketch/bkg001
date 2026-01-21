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
import { AvailabilitySlotService } from '../../domain/services/AvailabilitySlotService';
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

    // Step 5: Get existing appointments for the date
    const doctorAppointments = await this.appointmentRepository.findByDoctor(dto.doctorId);
    const dateAppointments = doctorAppointments.filter((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === requestDate.getTime() &&
        apt.getStatus() !== 'CANCELLED';
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

    // Step 7: Generate slots
    const slots = AvailabilitySlotService.generateSlotsForDate(
      requestDate,
      availability.workingDays,
      overrides,
      availability.breaks,
      dateAppointments,
      slotConfig
    );

    // Step 8: Filter to only available slots and map to DTOs
    return slots
      .filter((slot) => slot.isAvailable)
      .map((slot) => ({
        startTime: this.formatTime(slot.startTime),
        endTime: this.formatTime(slot.endTime),
        duration: slot.duration,
        isAvailable: true,
      }));
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
