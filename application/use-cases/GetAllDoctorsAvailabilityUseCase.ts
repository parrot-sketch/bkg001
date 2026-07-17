/**
 * Use Case: GetAllDoctorsAvailabilityUseCase
 * 
 * Orchestrates getting all doctors' availability for a date range.
 * 
 * Simplified for frontdesk dashboard: returns whether each doctor
 * has an active availability template configured.
 * 
 * Business Purpose:
 * - Front desk views which doctors are on duty
 * - Used for appointment booking requests (doctor confirms later)
 * 
 * Business Rules:
 * - Only FRONTDESK and ADMIN can access
 * - Date range must be valid
 * - Returns all active doctors with availability status
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

  async execute(dto: GetAllDoctorsAvailabilityDto): Promise<DoctorAvailabilityResponseDto[]> {
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

    const availabilityStatus = await this.availabilityRepository.getDoctorsAvailability(
      doctorIds,
      dto.startDate,
      dto.endDate
    );

    const availabilityMap = new Map(
      availabilityStatus.map(a => [a.doctorId, a.isAvailable])
    );

    return doctors
      .map(doctor => ({
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        isAvailable: availabilityMap.get(doctor.id) || false,
      }))
      .sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }
}
