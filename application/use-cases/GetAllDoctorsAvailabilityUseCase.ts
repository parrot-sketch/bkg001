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
   * @returns Promise resolving to array of DoctorAvailabilityResponseDto (only doctors with open slots)
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
    const allAvailability = await this.availabilityRepository.getDoctorsAvailability(
      doctorIds,
      dto.startDate,
      dto.endDate
    );

    // Step 4: PERFORMANCE OPTIMIZATION - Filter doctors with no working days first
    // This eliminates doctors we know have zero availability
    const doctorsWithWorkingDays = allAvailability.filter(
      av => av.workingDays && av.workingDays.length > 0
    );

    if (doctorsWithWorkingDays.length === 0) {
      return [];
    }

    // Step 5: PERFORMANCE OPTIMIZATION - Bulk fetch appointment counts
    // Single query to get appointment counts for all doctors in date range
    // This is much faster than N queries or calculating slot-by-slot
    const appointmentCounts = await this.prisma.appointment.groupBy({
      by: ['doctor_id'],
      where: {
        doctor_id: { in: doctorsWithWorkingDays.map(av => av.doctorId) },
        scheduled_at: {
          gte: dto.startDate,
          lte: dto.endDate,
        },
        status: { notIn: ['CANCELLED'] },
      },
      _count: {
        id: true,
      },
    });

    const appointmentCountMap = new Map(
      appointmentCounts.map(ac => [ac.doctor_id, ac._count.id])
    );

    // Step 6: Filter doctors based on availability heuristic
    // A doctor is "available" if they have working days AND are not fully booked
    const results: DoctorAvailabilityResponseDto[] = [];

    for (const availability of doctorsWithWorkingDays) {
      const doctor = doctorsMap.get(availability.doctorId);

      // Calculate theoretical maximum slots for this doctor in the date range
      const theoreticalSlots = this.calculateTheoreticalSlots(
        availability.workingDays,
        dto.startDate,
        dto.endDate
      );

      // Get actual booked appointments
      const bookedCount = appointmentCountMap.get(availability.doctorId) || 0;

      // HEURISTIC: Show doctor if they have < 95% utilization
      // This means they likely have at least a few open slots
      // 95% threshold accounts for edge cases while being performant
      const utilizationRate = theoreticalSlots > 0 ? bookedCount / theoreticalSlots : 0;
      const hasLikelyAvailability = utilizationRate < 0.95;

      if (hasLikelyAvailability) {
        // Filter overrides by date range locally
        const relevantOverrides = availability.overrides.filter(ov =>
          (ov.startDate <= dto.endDate && ov.endDate >= dto.startDate)
        );

        results.push({
          doctorId: availability.doctorId,
          doctorName: doctor?.name || 'Unknown Doctor',
          specialization: doctor?.specialization || 'General',
          workingDays: availability.workingDays.map((wd) => ({
            day: wd.day,
            startTime: wd.startTime,
            endTime: wd.endTime,
            isAvailable: wd.isAvailable,
            type: wd.type,
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
          sessions: availability.sessions.map((sess) => ({
            workingDayId: sess.workingDayId,
            day: availability.workingDays.find(wd => wd.id === sess.workingDayId)?.day || 'Unknown',
            startTime: sess.startTime,
            endTime: sess.endTime,
            sessionType: sess.sessionType,
            maxPatients: sess.maxPatients,
            notes: sess.notes,
          })),
        });
      }
    }

    // Sort by doctor name to match original order
    return results.sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }

  /**
   * Calculate theoretical maximum slots for a doctor in a date range
   * PERFORMANCE: This is a simple calculation, not a database query
   */
  private calculateTheoreticalSlots(
    workingDays: any[],
    startDate: Date,
    endDate: Date
  ): number {
    let totalSlots = 0;
    const slotDuration = 30; // minutes per slot

    // Iterate through each day in the range
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Find working days for this day of week
      const dayWorkingHours = workingDays.filter(
        (wd: any) => wd.dayOfWeek === dayOfWeek && wd.isAvailable
      );

      for (const wd of dayWorkingHours) {
        // Parse time strings
        const [startH, startM] = wd.startTime.split(':').map(Number);
        const [endH, endM] = wd.endTime.split(':').map(Number);

        // Calculate minutes in this working period
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const workingMinutes = endMinutes - startMinutes;

        // Calculate number of slots
        const slotsInPeriod = Math.floor(workingMinutes / slotDuration);
        totalSlots += slotsInPeriod;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalSlots;
  }
}

