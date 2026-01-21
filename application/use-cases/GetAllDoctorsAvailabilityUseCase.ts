/**
 * Use Case: GetAllDoctorsAvailabilityUseCase
 * 
 * Orchestrates getting all doctors' availability for a date range.
 * 
 * Business Purpose:
 * - Front desk views unified availability calendar
 * - Used for scheduling consultations across multiple doctors
 * - Shows which doctors are available when
 * 
 * Clinical Workflow:
 * This is part of the front desk scheduling workflow:
 * 1. Front desk views availability calendar → GetAllDoctorsAvailabilityUseCase (this)
 * 2. Front desk selects doctor and slot
 * 3. Front desk schedules appointment
 * 
 * Business Rules:
 * - Only FRONTDESK and ADMIN can access
 * - Date range must be valid
 * - Returns availability for all active doctors
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { DoctorAvailabilityResponseDto } from '../dtos/DoctorAvailabilityResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

export interface GetAllDoctorsAvailabilityDto {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly specialization?: string;
}

export class GetAllDoctorsAvailabilityUseCase {
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
   * Executes the get all doctors availability use case
   * 
   * @param dto - GetAllDoctorsAvailabilityDto with date range and optional specialization
   * @returns Promise resolving to array of DoctorAvailabilityResponseDto
   * @throws DomainException if validation fails
   */
  async execute(dto: GetAllDoctorsAvailabilityDto): Promise<DoctorAvailabilityResponseDto[]> {
    // Step 1: Validate date range
    if (dto.endDate < dto.startDate) {
      throw new DomainException('End date must be after start date', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    const daysDiff = Math.ceil((dto.endDate.getTime() - dto.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new DomainException('Date range cannot exceed 90 days', {
        daysDiff,
      });
    }

    // Step 2: Get all active doctors
    const whereClause: any = {};
    if (dto.specialization) {
      whereClause.specialization = dto.specialization;
    }

    const doctors = await this.prisma.doctor.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        specialization: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Step 3: Get availability for each doctor
    const availabilityPromises = doctors.map(async (doctor) => {
      const availability = await this.availabilityRepository.getDoctorAvailability(doctor.id);
      const overrides = await this.availabilityRepository.getOverrides(
        doctor.id,
        dto.startDate,
        dto.endDate
      );

      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        workingDays: availability?.workingDays.map((wd) => ({
          day: wd.day,
          startTime: wd.startTime,
          endTime: wd.endTime,
          isAvailable: wd.isAvailable,
        })) || [],
        slotConfiguration: availability?.slotConfiguration ? {
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
    });

    return Promise.all(availabilityPromises);
  }
}
