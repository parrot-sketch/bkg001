/**
 * Domain Service: AvailabilityService
 * 
 * Enterprise-grade availability computation with layered priority resolution.
 * 
 * Resolution Order (Highest to Lowest):
 * 1. ScheduleBlock (explicit unavailable)
 * 2. AvailabilityOverride (custom hours or blocking)
 * 3. ScheduleSession (weekly recurring sessions)
 * 4. AvailabilityBreak (recurring breaks within sessions)
 * 
 * This service encapsulates all availability logic and must be used by
 * use cases and API routes. UI must never compute availability directly.
 */

import {
  WorkingDay,
  ScheduleSession,
  AvailabilityOverride,
  ScheduleBlock,
  AvailabilityBreak,
  SlotConfiguration,
} from '../interfaces/repositories/IAvailabilityRepository';
import { Appointment } from '../entities/Appointment';

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  isAvailable: boolean;
  sessionType?: string; // From ScheduleSession
}

export interface AvailabilityCalendarDay {
  date: Date;
  hasAvailability: boolean;
  availableSlotsCount: number;
  sessions: Array<{
    startTime: string;
    endTime: string;
    sessionType?: string;
  }>;
}

export class AvailabilityService {
  /**
   * Get available slots for a specific date
   * 
   * Resolves all layers: blocks, overrides, sessions, breaks, appointments
   * 
   * @param date - Date to check
   * @param workingDays - Weekly working days
   * @param sessions - All schedule sessions (grouped by working day)
   * @param overrides - Date-specific overrides
   * @param blocks - Explicit blocked periods
   * @param breaks - Recurring breaks
   * @param existingAppointments - Existing appointments for the date
   * @param slotConfig - Slot configuration
   * @returns Array of available slots
   */
  static getAvailableSlots(
    date: Date,
    workingDays: WorkingDay[],
    sessions: ScheduleSession[],
    overrides: AvailabilityOverride[],
    blocks: ScheduleBlock[],
    breaks: AvailabilityBreak[],
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): AvailableSlot[] {
    const dayOfWeek = this.getDayOfWeek(date);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Layer 1: Check ScheduleBlock (highest priority - explicit unavailable)
    const dateBlock = blocks.find((block) => {
      const blockStart = new Date(block.startDate);
      blockStart.setHours(0, 0, 0, 0);
      const blockEnd = new Date(block.endDate);
      blockEnd.setHours(23, 59, 59, 999);
      return checkDate >= blockStart && checkDate <= blockEnd;
    });

    if (dateBlock) {
      // If full day blocked (no start_time/end_time), return empty
      if (!dateBlock.startTime || !dateBlock.endTime) {
        return [];
      }
      // If partial block, we'll exclude that time range later
    }

    // Layer 2: Check AvailabilityOverride
    const dateOverride = overrides.find((ov) => {
      const ovStart = new Date(ov.startDate);
      ovStart.setHours(0, 0, 0, 0);
      const ovEnd = new Date(ov.endDate);
      ovEnd.setHours(23, 59, 59, 999);
      return checkDate >= ovStart && checkDate <= ovEnd;
    });

    // If override blocks this date, return empty
    if (dateOverride?.isBlocked) {
      return [];
    }

    // Layer 3: Get working day and sessions
    const workingDay = workingDays.find((wd) => wd.day === dayOfWeek && wd.isAvailable);
    if (!workingDay) {
      return []; // Doctor doesn't work on this day
    }

    // Get sessions for this working day
    const daySessions = sessions.filter((s) => s.workingDayId === workingDay.id);

    // If no sessions exist, use backward compatibility: single session from start_time/end_time
    const effectiveSessions: Array<{ startTime: string; endTime: string; sessionType?: string }> =
      daySessions.length === 0
        ? [{ startTime: workingDay.startTime, endTime: workingDay.endTime }]
        : daySessions.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            sessionType: s.sessionType,
          }));

    // If override provides custom hours, use those instead of sessions
    let finalSessions = effectiveSessions;
    if (dateOverride && !dateOverride.isBlocked && dateOverride.startTime && dateOverride.endTime) {
      finalSessions = [
        {
          startTime: dateOverride.startTime,
          endTime: dateOverride.endTime,
        },
      ];
    }

    // Generate slots for each session
    const allSlots: AvailableSlot[] = [];

    for (const session of finalSessions) {
      const [startHour, startMinute] = session.startTime.split(':').map(Number);
      const [endHour, endMinute] = session.endTime.split(':').map(Number);

      const sessionStart = new Date(date);
      sessionStart.setHours(startHour, startMinute, 0, 0);

      const sessionEnd = new Date(date);
      sessionEnd.setHours(endHour, endMinute, 0, 0);

      // Check if session conflicts with block time range
      if (dateBlock?.startTime && dateBlock?.endTime) {
        const [blockStartHour, blockStartMin] = dateBlock.startTime.split(':').map(Number);
        const [blockEndHour, blockEndMin] = dateBlock.endTime.split(':').map(Number);

        const blockStart = new Date(date);
        blockStart.setHours(blockStartHour, blockStartMin, 0, 0);
        const blockEnd = new Date(date);
        blockEnd.setHours(blockEndHour, blockEndMin, 0, 0);

        // If session is completely within block, skip it
        if (sessionStart >= blockStart && sessionEnd <= blockEnd) {
          continue;
        }

        // If session overlaps with block, adjust session boundaries
        if (sessionStart < blockEnd && sessionEnd > blockStart) {
          // Create slots before block
          if (sessionStart < blockStart) {
            const slotsBefore = this.generateSlotsForTimeRange(
              sessionStart,
              blockStart,
              slotConfig,
              breaks,
              dayOfWeek,
              existingAppointments,
              session.sessionType
            );
            allSlots.push(...slotsBefore);
          }

          // Create slots after block
          if (sessionEnd > blockEnd) {
            const slotsAfter = this.generateSlotsForTimeRange(
              blockEnd,
              sessionEnd,
              slotConfig,
              breaks,
              dayOfWeek,
              existingAppointments,
              session.sessionType
            );
            allSlots.push(...slotsAfter);
          }

          continue;
        }
      }

      // Generate slots for entire session
      const sessionSlots = this.generateSlotsForTimeRange(
        sessionStart,
        sessionEnd,
        slotConfig,
        breaks,
        dayOfWeek,
        existingAppointments,
        session.sessionType
      );
      allSlots.push(...sessionSlots);
    }

    // Filter to only available slots and sort by time
    return allSlots
      .filter((slot) => slot.isAvailable)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Generate slots for a time range
   */
  private static generateSlotsForTimeRange(
    startTime: Date,
    endTime: Date,
    slotConfig: SlotConfiguration,
    breaks: AvailabilityBreak[],
    dayOfWeek: string,
    existingAppointments: Appointment[],
    sessionType?: string
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const dayBreaks = breaks.filter((br) => br.dayOfWeek === dayOfWeek);

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotConfig.defaultDuration);

      if (slotEnd > endTime) {
        break; // Slot would extend beyond session
      }

      // Check if slot conflicts with breaks
      const conflictsWithBreak = dayBreaks.some((br) => {
        const [brStartHour, brStartMin] = br.startTime.split(':').map(Number);
        const [brEndHour, brEndMin] = br.endTime.split(':').map(Number);
        const brStart = new Date(currentTime);
        brStart.setHours(brStartHour, brStartMin, 0, 0);
        const brEnd = new Date(currentTime);
        brEnd.setHours(brEndHour, brEndMin, 0, 0);

        return (
          (currentTime >= brStart && currentTime < brEnd) ||
          (slotEnd > brStart && slotEnd <= brEnd) ||
          (currentTime <= brStart && slotEnd >= brEnd)
        );
      });

      // Check if slot conflicts with existing appointments
      const conflictsWithAppointment = existingAppointments.some((apt) => {
        const aptDate = new Date(apt.getAppointmentDate());
        const aptTime = apt.getTime();
        let aptHour: number;
        let aptMin: number;

        // Parse time (handle both HH:mm and h:mm a formats)
        if (aptTime.includes('AM') || aptTime.includes('PM')) {
          const timeMatch = aptTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            aptHour = parseInt(timeMatch[1], 10);
            aptMin = parseInt(timeMatch[2], 10);
            const period = timeMatch[3].toUpperCase();
            if (period === 'PM' && aptHour !== 12) {
              aptHour += 12;
            } else if (period === 'AM' && aptHour === 12) {
              aptHour = 0;
            }
          } else {
            return false;
          }
        } else {
          const timeParts = aptTime.split(':');
          if (timeParts.length !== 2) {
            return false;
          }
          aptHour = parseInt(timeParts[0], 10);
          aptMin = parseInt(timeParts[1], 10);
        }

        if (isNaN(aptHour) || isNaN(aptMin)) {
          return false;
        }

        aptDate.setHours(aptHour, aptMin, 0, 0);
        const aptEnd = new Date(aptDate);
        aptEnd.setMinutes(aptEnd.getMinutes() + slotConfig.defaultDuration);

        return (
          (currentTime >= aptDate && currentTime < aptEnd) ||
          (slotEnd > aptDate && slotEnd <= aptEnd) ||
          (currentTime <= aptDate && slotEnd >= aptEnd)
        );
      });

      const isAvailable = !conflictsWithBreak && !conflictsWithAppointment;

      slots.push({
        startTime: new Date(currentTime),
        endTime: new Date(slotEnd),
        duration: slotConfig.defaultDuration,
        isAvailable,
        sessionType,
      });

      // Move to next slot
      currentTime.setMinutes(currentTime.getMinutes() + slotConfig.slotInterval);
    }

    return slots;
  }

  /**
   * Get availability calendar for a date range
   * Returns which dates have availability
   */
  static getAvailabilityCalendar(
    startDate: Date,
    endDate: Date,
    workingDays: WorkingDay[],
    sessions: ScheduleSession[],
    overrides: AvailabilityOverride[],
    blocks: ScheduleBlock[],
    breaks: AvailabilityBreak[],
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): AvailabilityCalendarDay[] {
    const calendar: AvailabilityCalendarDay[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (currentDate <= end) {
      const dayOfWeek = this.getDayOfWeek(currentDate);
      const workingDay = workingDays.find((wd) => wd.day === dayOfWeek && wd.isAvailable);

      // Get appointments for this date
      // Only count active appointments that occupy slots (exclude CANCELLED, COMPLETED)
      // Note: Prisma enum only has PENDING, SCHEDULED, CANCELLED, COMPLETED
      const excludedStatuses = ['CANCELLED', 'COMPLETED'];
      const dateAppointments = existingAppointments.filter((apt) => {
        const aptDate = new Date(apt.getAppointmentDate());
        aptDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === checkDate.getTime() && !excludedStatuses.includes(apt.getStatus() as string);
      });

      // Get available slots
      const availableSlots = this.getAvailableSlots(
        currentDate,
        workingDays,
        sessions,
        overrides,
        blocks,
        breaks,
        dateAppointments,
        slotConfig
      );

      // Get sessions for display
      const daySessions =
        workingDay && workingDay.isAvailable
          ? sessions
              .filter((s) => s.workingDayId === workingDay.id)
              .map((s) => ({
                startTime: s.startTime,
                endTime: s.endTime,
                sessionType: s.sessionType,
              }))
          : [];

      calendar.push({
        date: new Date(currentDate),
        hasAvailability: availableSlots.length > 0,
        availableSlotsCount: availableSlots.length,
        sessions: daySessions,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return calendar;
  }

  /**
   * Check if a specific time slot is available
   */
  static isSlotAvailable(
    date: Date,
    time: string, // HH:mm
    duration: number, // minutes
    workingDays: WorkingDay[],
    sessions: ScheduleSession[],
    overrides: AvailabilityOverride[],
    blocks: ScheduleBlock[],
    breaks: AvailabilityBreak[],
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): { isAvailable: boolean; reason?: string } {
    const availableSlots = this.getAvailableSlots(
      date,
      workingDays,
      sessions,
      overrides,
      blocks,
      breaks,
      existingAppointments,
      slotConfig
    );

    const [hour, minute] = time.split(':').map(Number);
    const requestedStart = new Date(date);
    requestedStart.setHours(hour, minute, 0, 0);
    const requestedEnd = new Date(requestedStart);
    requestedEnd.setMinutes(requestedEnd.getMinutes() + duration);

    // Check if requested time matches an available slot
    const matchingSlot = availableSlots.find((slot) => {
      return (
        slot.startTime.getTime() === requestedStart.getTime() &&
        slot.duration === duration &&
        slot.isAvailable
      );
    });

    if (matchingSlot) {
      return { isAvailable: true };
    }

    // Check why it's not available
    const dayOfWeek = this.getDayOfWeek(date);
    const workingDay = workingDays.find((wd) => wd.day === dayOfWeek);

    if (!workingDay || !workingDay.isAvailable) {
      return { isAvailable: false, reason: 'Doctor does not work on this day' };
    }

    // Check block
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dateBlock = blocks.find((block) => {
      const blockStart = new Date(block.startDate);
      blockStart.setHours(0, 0, 0, 0);
      const blockEnd = new Date(block.endDate);
      blockEnd.setHours(23, 59, 59, 999);
      return checkDate >= blockStart && checkDate <= blockEnd;
    });

    if (dateBlock) {
      if (!dateBlock.startTime || !dateBlock.endTime) {
        return { isAvailable: false, reason: 'Doctor is unavailable on this date' };
      }
      // Check if time falls within block
      const [blockStartHour, blockStartMin] = dateBlock.startTime.split(':').map(Number);
      const [blockEndHour, blockEndMin] = dateBlock.endTime.split(':').map(Number);
      const blockStart = new Date(date);
      blockStart.setHours(blockStartHour, blockStartMin, 0, 0);
      const blockEnd = new Date(date);
      blockEnd.setHours(blockEndHour, blockEndMin, 0, 0);

      if (requestedStart >= blockStart && requestedEnd <= blockEnd) {
        return { isAvailable: false, reason: 'Time falls within blocked period' };
      }
    }

    // Check override
    const dateOverride = overrides.find((ov) => {
      const ovStart = new Date(ov.startDate);
      ovStart.setHours(0, 0, 0, 0);
      const ovEnd = new Date(ov.endDate);
      ovEnd.setHours(23, 59, 59, 999);
      return checkDate >= ovStart && checkDate <= ovEnd;
    });

    if (dateOverride?.isBlocked) {
      return { isAvailable: false, reason: 'Doctor is unavailable on this date' };
    }

    // Check existing appointments
    const conflictsWithAppointment = existingAppointments.some((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      aptDate.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const requestDateNormalized = new Date(date);
      requestDateNormalized.setHours(0, 0, 0, 0);
      
      // Only check appointments on the same date
      if (aptDate.getTime() !== requestDateNormalized.getTime()) {
        return false;
      }
      
      const aptTime = apt.getTime();
      
      // Parse appointment time - handle HH:mm format
      let aptHour: number;
      let aptMin: number;
      
      if (aptTime.includes('AM') || aptTime.includes('PM')) {
        // Handle 12-hour format (shouldn't happen but just in case)
        const timeMatch = aptTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return false;
        aptHour = parseInt(timeMatch[1], 10);
        aptMin = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && aptHour !== 12) {
          aptHour += 12;
        } else if (period === 'AM' && aptHour === 12) {
          aptHour = 0;
        }
      } else {
        // Handle 24-hour format (HH:mm)
        const timeParts = aptTime.split(':');
        if (timeParts.length !== 2) return false;
        aptHour = parseInt(timeParts[0], 10);
        aptMin = parseInt(timeParts[1], 10);
      }
      
      if (isNaN(aptHour) || isNaN(aptMin)) {
        console.warn(`Invalid appointment time format: ${aptTime}`);
        return false;
      }
      
      // Create appointment start/end times on the same date
      const aptStart = new Date(date);
      aptStart.setHours(aptHour, aptMin, 0, 0);
      const aptEnd = new Date(aptStart);
      aptEnd.setMinutes(aptEnd.getMinutes() + slotConfig.defaultDuration);
      
      // Check for overlap
      const hasConflict = (
        (requestedStart >= aptStart && requestedStart < aptEnd) ||
        (requestedEnd > aptStart && requestedEnd <= aptEnd) ||
        (requestedStart <= aptStart && requestedEnd >= aptEnd)
      );
      
      if (hasConflict) {
        console.log(`[AvailabilityService] Conflict detected:`, {
          requestedTime: time,
          requestedDate: date.toISOString(),
          appointmentTime: aptTime,
          appointmentDate: apt.getAppointmentDate().toISOString(),
          appointmentStatus: apt.getStatus(),
          requestedStart: requestedStart.toISOString(),
          requestedEnd: requestedEnd.toISOString(),
          aptStart: aptStart.toISOString(),
          aptEnd: aptEnd.toISOString(),
        });
      }
      
      return hasConflict;
    });

    if (conflictsWithAppointment) {
      return { isAvailable: false, reason: 'Time slot is already booked' };
    }

    return { isAvailable: false, reason: 'Time slot is not available' };
  }

  /**
   * Get day of week as string (Monday, Tuesday, etc.)
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }
}
