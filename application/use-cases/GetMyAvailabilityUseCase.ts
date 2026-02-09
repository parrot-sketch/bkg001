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
   * @param doctorId - Doctor ID (caller must have already validated this exists)
   * @param options.skipValidation - Skip the doctor-exists query when the caller
   *   already verified the doctor (e.g. from auth context). Saves 1 DB round-trip.
   * @returns Promise resolving to DoctorAvailabilityResponseDto
   * @throws DomainException if doctor not found
   */
  async execute(
    doctorId: string,
    { skipValidation = false }: { skipValidation?: boolean } = {}
  ): Promise<DoctorAvailabilityResponseDto> {
    // Step 1: Validate doctor exists (skippable when caller already confirmed)
    let doctorName = '';
    let specialization = '';

    if (!skipValidation) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, name: true, specialization: true },
      });

      if (!doctor) {
        throw new DomainException(`Doctor with ID ${doctorId} not found`, { doctorId });
      }
      doctorName = doctor.name;
      specialization = doctor.specialization;
    }

    // Step 2: Get doctor availability (template + slots + overrides + blocks + slotConfig)
    const availability = await this.availabilityRepository.getDoctorAvailability(doctorId);

    if (!availability) {
      return {
        doctorId,
        doctorName,
        specialization,
        workingDays: [],
        overrides: [],
        sessions: [],
      };
    }

    // Step 3: Filter overrides to next 90 days in memory
    //   (getDoctorAvailability already fetched ALL overrides — no need for a second query)
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const recentOverrides = (availability.overrides || []).filter((ov) => {
      const end = new Date(ov.endDate);
      const start = new Date(ov.startDate);
      return end >= now && start <= ninetyDaysFromNow;
    });

    // Step 4: Map sessions to include day name for easier frontend mapping
    const sessionsWithDay = availability.sessions.map((session) => {
      const workingDay = availability.workingDays.find((wd) => wd.id === session.workingDayId);
      return {
        workingDayId: session.workingDayId,
        day: workingDay?.day || '',
        startTime: session.startTime,
        endTime: session.endTime,
        sessionType: session.sessionType,
        maxPatients: session.maxPatients,
        notes: session.notes,
      };
    });

    // Step 5: Map to response DTO
    return {
      doctorId: availability.doctorId,
      doctorName: doctorName || '',
      specialization: specialization || '',
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
      overrides: recentOverrides.map((ov) => ({
        id: ov.id,
        startDate: ov.startDate,
        endDate: ov.endDate,
        reason: ov.reason,
        isBlocked: ov.isBlocked,
      })),
      sessions: sessionsWithDay,
    };
  }
}
