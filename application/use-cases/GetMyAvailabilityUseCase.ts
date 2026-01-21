/**
 * Use Case: GetMyAvailabilityUseCase
 * 
 * Orchestrates getting a doctor's own availability.
 * 
 * Business Purpose:
 * - Doctor views their working days, breaks, overrides, and slot configuration
 * - Used in doctor profile/availability management UI
 * 
 * Clinical Workflow:
 * This is part of the doctor availability management:
 * 1. Doctor views availability → GetMyAvailabilityUseCase (this)
 * 2. Doctor updates availability → SetDoctorAvailabilityUseCase
 * 
 * Business Rules:
 * - Doctor must exist
 * - Only doctor can view their own availability (or admin)
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { DoctorAvailabilityResponseDto } from '../dtos/DoctorAvailabilityResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

export class GetMyAvailabilityUseCase {
  constructor(
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly prisma: PrismaClient,
  ) {
    if (!availabilityRepository) {
      throw new Error('AvailabilityRepository is required');
    }
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Executes the get my availability use case
   * 
   * @param doctorId - Doctor ID
   * @returns Promise resolving to DoctorAvailabilityResponseDto
   * @throws DomainException if doctor not found
   */
  async execute(doctorId: string): Promise<DoctorAvailabilityResponseDto> {
    // Step 1: Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        name: true,
        specialization: true,
      },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${doctorId} not found`, {
        doctorId,
      });
    }

    // Step 2: Get doctor availability
    const availability = await this.availabilityRepository.getDoctorAvailability(doctorId);

    if (!availability) {
      // Return empty availability if not configured
      return {
        doctorId,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        workingDays: [],
        overrides: [],
      };
    }

    // Step 3: Get overrides for next 90 days (for display)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    const overrides = await this.availabilityRepository.getOverrides(doctorId, startDate, endDate);

    // Step 4: Map to response DTO
    return {
      doctorId: availability.doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      workingDays: availability.workingDays.map((wd) => ({
        day: wd.day,
        startTime: wd.startTime,
        endTime: wd.endTime,
        isAvailable: wd.isAvailable,
      })),
      slotConfiguration: availability.slotConfiguration ? {
        defaultDuration: availability.slotConfiguration.defaultDuration,
        bufferTime: availability.slotConfiguration.bufferTime,
        slotInterval: availability.slotConfiguration.slotInterval,
      } : undefined,
      overrides: overrides.map((ov) => ({
        id: ov.id,
        startDate: ov.startDate,
        endDate: ov.endDate,
        reason: ov.reason,
        isBlocked: ov.isBlocked,
      })),
    };
  }
}
