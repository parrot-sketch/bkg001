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

    if (doctors.length === 0) {
      return [];
    }

    const doctorIds = doctors.map(d => d.id);
    const doctorsMap = new Map(doctors.map(d => [d.id, d]));

    // Step 3: Bulk fetch availability for all doctors
    // This replaces the N+1 query pattern with a single efficient bulk fetch
    // Optimized: Only fetch overrides and blocks within the requested date range
    const allAvailability = await this.availabilityRepository.getDoctorsAvailability(
      doctorIds,
      dto.startDate,
      dto.endDate
    );

    // Step 4: Map results and filter locally
    const results: DoctorAvailabilityResponseDto[] = allAvailability.map(availability => {
      const doctor = doctorsMap.get(availability.doctorId);

      // Filter overrides by date range locally
      const relevantOverrides = availability.overrides.filter(ov =>
        (ov.startDate <= dto.endDate && ov.endDate >= dto.startDate)
      );

      return {
        doctorId: availability.doctorId,
        doctorName: doctor?.name || 'Unknown Doctor',
        specialization: doctor?.specialization || 'General',
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
        overrides: relevantOverrides.map((ov) => ({
          id: ov.id,
          startDate: ov.startDate,
          endDate: ov.endDate,
          reason: ov.reason,
          isBlocked: ov.isBlocked,
        })),
      };
    });

    // Ensure we return results for all queried doctors (even if they have no availability set up)
    // The repository might only return records for doctors who have *some* data
    const existingAvailabilityDoctorIds = new Set(results.map(r => r.doctorId));

    // Add empty availability for doctors missing from the result
    for (const doctor of doctors) {
      if (!existingAvailabilityDoctorIds.has(doctor.id)) {
        results.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          workingDays: [],
          slotConfiguration: undefined,
          overrides: [],
        });
      }
    }

    // Sort by doctor name to match original order
    return results.sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }
}
