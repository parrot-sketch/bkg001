/**
 * Use Case: SetDoctorAvailabilityUseCase
 * 
 * Orchestrates setting a doctor's availability (working days, breaks, slot configuration).
 * 
 * Business Purpose:
 * - Doctor updates their working schedule
 * - Doctor sets breaks (lunch, etc.)
 * - Doctor configures slot duration and intervals
 * 
 * Clinical Workflow:
 * This is part of the doctor availability management:
 * 1. Doctor views availability → GetMyAvailabilityUseCase
 * 2. Doctor updates availability → SetDoctorAvailabilityUseCase (this)
 * 
 * Business Rules:
 * - Doctor must exist
 * - Only doctor can update their own availability (or admin)
 * - Working days must be valid
 * - Breaks must be within working hours
 * - Slot configuration must be valid
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { SetDoctorAvailabilityDto, WorkingDayDto } from '../dtos/SetDoctorAvailabilityDto';
import { DoctorAvailabilityResponseDto } from '../dtos/DoctorAvailabilityResponseDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { validateSessionsNoOverlap } from '../validators/ScheduleValidationHelpers';

export class SetDoctorAvailabilityUseCase {
  constructor(
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly prisma: PrismaClient,
    private readonly auditService: IAuditService,
  ) {
    if (!availabilityRepository) {
      throw new Error('AvailabilityRepository is required');
    }
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }
  }

  /**
   * Executes the set doctor availability use case
   * 
   * @param dto - SetDoctorAvailabilityDto with availability data
   * @returns Promise resolving to DoctorAvailabilityResponseDto
   * @throws DomainException if validation fails
   */
  async execute(dto: SetDoctorAvailabilityDto): Promise<DoctorAvailabilityResponseDto> {
    // Step 1: Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      select: {
        id: true,
        name: true,
        specialization: true,
      },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Validate working days
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

    for (const workingDay of dto.workingDays) {
      if (!validDays.includes(workingDay.day)) {
        throw new DomainException(`Invalid day: ${workingDay.day}. Must be one of: ${validDays.join(', ')}`, {
          day: workingDay.day,
        });
      }

      if (!timeRegex.test(workingDay.startTime)) {
        throw new DomainException(`Invalid start time format: ${workingDay.startTime}. Must be HH:mm`, {
          startTime: workingDay.startTime,
        });
      }

      if (!timeRegex.test(workingDay.endTime)) {
        throw new DomainException(`Invalid end time format: ${workingDay.endTime}. Must be HH:mm`, {
          endTime: workingDay.endTime,
        });
      }

      // Validate end time is after start time
      const [startHours, startMinutes] = workingDay.startTime.split(':').map(Number);
      const [endHours, endMinutes] = workingDay.endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        throw new DomainException(`End time must be after start time for ${workingDay.day}`, {
          day: workingDay.day,
          startTime: workingDay.startTime,
          endTime: workingDay.endTime,
        });
      }

      // Validate breaks are within working hours
      if (workingDay.breaks) {
        for (const br of workingDay.breaks) {
          if (!timeRegex.test(br.startTime) || !timeRegex.test(br.endTime)) {
            throw new DomainException(`Invalid break time format. Must be HH:mm`, {
              break: br,
            });
          }

          const [brStartHours, brStartMinutes] = br.startTime.split(':').map(Number);
          const [brEndHours, brEndMinutes] = br.endTime.split(':').map(Number);
          const brStartTotal = brStartHours * 60 + brStartMinutes;
          const brEndTotal = brEndHours * 60 + brEndMinutes;

          if (brEndTotal <= brStartTotal) {
            throw new DomainException(`Break end time must be after start time for ${workingDay.day}`, {
              day: workingDay.day,
              break: br,
            });
          }

          if (brStartTotal < startTotal || brEndTotal > endTotal) {
            throw new DomainException(`Break must be within working hours for ${workingDay.day}`, {
              day: workingDay.day,
              break: br,
              workingHours: { start: workingDay.startTime, end: workingDay.endTime },
            });
          }
        }
      }
    }

    // Step 3: Validate slot configuration if provided
    if (dto.slotConfiguration) {
      if (dto.slotConfiguration.defaultDuration <= 0 || dto.slotConfiguration.defaultDuration > 240) {
        throw new DomainException('Default duration must be between 1 and 240 minutes', {
          duration: dto.slotConfiguration.defaultDuration,
        });
      }

      if (dto.slotConfiguration.bufferTime < 0 || dto.slotConfiguration.bufferTime > 60) {
        throw new DomainException('Buffer time must be between 0 and 60 minutes', {
          bufferTime: dto.slotConfiguration.bufferTime,
        });
      }

      if (dto.slotConfiguration.slotInterval <= 0 || dto.slotConfiguration.slotInterval > 60) {
        throw new DomainException('Slot interval must be between 1 and 60 minutes', {
          slotInterval: dto.slotConfiguration.slotInterval,
        });
      }

      if (dto.slotConfiguration.slotInterval > dto.slotConfiguration.defaultDuration) {
        throw new DomainException('Slot interval cannot be greater than default duration', {
          slotInterval: dto.slotConfiguration.slotInterval,
          defaultDuration: dto.slotConfiguration.defaultDuration,
        });
      }
    }

    // Step 4: Clean up orphaned sessions first
    // This fixes any sessions that reference deleted working days from previous buggy saves
    await this.prisma.$executeRaw`
      DELETE FROM "ScheduleSession" 
      WHERE working_day_id NOT IN (
        SELECT id FROM "WorkingDay"
      )
    `;

    // Step 4a: Save working days
    const workingDays = dto.workingDays.map((wd) => ({
      id: 0, // Will be assigned by repository
      doctorId: dto.doctorId,
      day: wd.day,
      startTime: wd.startTime,
      endTime: wd.endTime,
      isAvailable: wd.isAvailable ?? true,
    }));

    await this.availabilityRepository.saveWorkingDays(dto.doctorId, workingDays);

    // Step 4b: Save sessions for each working day (enterprise feature)
    // Get saved working days to get their IDs
    const savedWorkingDays = await this.availabilityRepository.getWorkingDays(dto.doctorId);
    const workingDaysMap = new Map(savedWorkingDays.map((wd) => [wd.day, wd]));

    for (const wdDto of dto.workingDays) {
      const savedWorkingDay = workingDaysMap.get(wdDto.day);
      if (savedWorkingDay && wdDto.sessions && wdDto.sessions.length > 0) {
        // Validate sessions
        for (const session of wdDto.sessions) {
          if (!timeRegex.test(session.startTime) || !timeRegex.test(session.endTime)) {
            throw new DomainException(`Invalid session time format. Must be HH:mm`, {
              day: wdDto.day,
              session,
            });
          }

          const [sessionStartHours, sessionStartMinutes] = session.startTime.split(':').map(Number);
          const [sessionEndHours, sessionEndMinutes] = session.endTime.split(':').map(Number);
          const sessionStartTotal = sessionStartHours * 60 + sessionStartMinutes;
          const sessionEndTotal = sessionEndHours * 60 + sessionEndMinutes;

          if (sessionEndTotal <= sessionStartTotal) {
            throw new DomainException(`Session end time must be after start time for ${wdDto.day}`, {
              day: wdDto.day,
              session,
            });
          }
        }

        // Validate sessions don't overlap (Rule 1: No overlapping sessions on same day)
        try {
          validateSessionsNoOverlap(wdDto.sessions, wdDto.day);
        } catch (error) {
          throw new DomainException(
            error instanceof Error ? error.message : 'Sessions cannot overlap on the same day',
            {
              day: wdDto.day,
              sessions: wdDto.sessions,
            }
          );
        }

        // Save sessions (replaces existing)
        await this.availabilityRepository.saveSessionsForWorkingDay(
          savedWorkingDay.id,
          wdDto.sessions.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            sessionType: s.sessionType,
            maxPatients: s.maxPatients,
            notes: s.notes,
          }))
        );
      }
      // If no sessions provided, backward compatibility: system will use startTime/endTime
    }

    // Step 5: Save breaks (delete existing and create new)
    const existingBreaks = await this.availabilityRepository.getBreaks(dto.doctorId);
    for (const br of existingBreaks) {
      await this.availabilityRepository.deleteBreak(br.id);
    }

    for (const wd of dto.workingDays) {
      if (wd.breaks) {
        for (const br of wd.breaks) {
          await this.availabilityRepository.createBreak({
            doctorId: dto.doctorId,
            dayOfWeek: wd.day,
            startTime: br.startTime,
            endTime: br.endTime,
            reason: br.reason,
          });
        }
      }
    }

    // Step 6: Save slot configuration if provided
    if (dto.slotConfiguration) {
      await this.availabilityRepository.saveSlotConfiguration({
        id: '', // Will be assigned by repository
        doctorId: dto.doctorId,
        defaultDuration: dto.slotConfiguration.defaultDuration,
        bufferTime: dto.slotConfiguration.bufferTime,
        slotInterval: dto.slotConfiguration.slotInterval,
      });
    }

    // Step 7: Record audit event
    await this.auditService.recordEvent({
      userId: dto.doctorId,
      recordId: dto.doctorId,
      action: 'UPDATE',
      model: 'DoctorAvailability',
      details: `Doctor availability updated. Working days: ${dto.workingDays.length}`,
    });

    // Step 8: Get updated availability and return
    const updatedAvailability = await this.availabilityRepository.getDoctorAvailability(dto.doctorId);
    const overrides = await this.availabilityRepository.getOverrides(
      dto.doctorId,
      new Date(),
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Next 90 days
    );

    return {
      doctorId: dto.doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      workingDays: updatedAvailability!.workingDays.map((wd) => ({
        day: wd.day,
        startTime: wd.startTime,
        endTime: wd.endTime,
        isAvailable: wd.isAvailable,
      })),
      slotConfiguration: updatedAvailability!.slotConfiguration ? {
        defaultDuration: updatedAvailability!.slotConfiguration.defaultDuration,
        bufferTime: updatedAvailability!.slotConfiguration.bufferTime,
        slotInterval: updatedAvailability!.slotConfiguration.slotInterval,
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
