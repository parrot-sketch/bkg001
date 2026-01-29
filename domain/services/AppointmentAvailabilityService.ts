import { SlotWindow } from '../value-objects/SlotWindow';
import { DomainException } from '../exceptions/DomainException';

/**
 * Domain Service: AppointmentAvailabilityService
 * 
 * Responsible for checking doctor availability and suggesting available time slots.
 * Handles complex logic around working hours, break times, and availability constraints.
 * 
 * This service is stateless and focuses on pure business logic.
 * It does not access the database or modify any entities.
 * 
 * Use cases:
 * - Check if a doctor is available during a specific time window
 * - Get available time slots for a doctor within a date range
 * - Check doctor's working hours
 */
export interface DoctorAvailability {
  doctorId: string;
  workingHours: {
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    startTime: string; // "09:00"
    endTime: string; // "17:00"
  }[];
  breakTimes: {
    startTime: string; // "12:00"
    endTime: string; // "13:00"
  }[];
}

export class AppointmentAvailabilityService {
  /**
   * Checks if a doctor is available (not in break time) at a specific time
   * 
   * @param time - The time to check
   * @param breakTimes - Array of break time windows
   * @returns true if doctor is not in a break time
   */
  static isNotInBreakTime(
    time: Date,
    breakTimes: SlotWindow[],
  ): boolean {
    return !breakTimes.some((breakSlot) => breakSlot.containsTime(time));
  }

  /**
   * Checks if a doctor is available during the entire appointment slot
   * 
   * @param appointmentSlot - The appointment time slot to check
   * @param breakTimes - Array of break time windows
   * @returns true if appointment slot doesn't overlap with any breaks
   */
  static isAvailableDuringSlot(
    appointmentSlot: SlotWindow,
    breakTimes: SlotWindow[],
  ): boolean {
    return !breakTimes.some((breakSlot) =>
      appointmentSlot.overlapsWithSlot(breakSlot)
    );
  }

  /**
   * Checks if a time is within a doctor's working hours
   * 
   * @param time - The time to check
   * @param workingHours - Working hours for the day (startTime and endTime in "HH:mm" format)
   * @returns true if time is within working hours
   */
  static isWithinWorkingHours(
    time: Date,
    workingHours: {
      startTime: string;
      endTime: string;
    },
  ): boolean {
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);

    const timeInMinutes = time.getHours() * 60 + time.getMinutes();
    const workStartInMinutes = startHour * 60 + startMin;
    const workEndInMinutes = endHour * 60 + endMin;

    return timeInMinutes >= workStartInMinutes && timeInMinutes < workEndInMinutes;
  }

  /**
   * Checks if an appointment slot is fully within working hours
   * 
   * @param appointmentSlot - The appointment time slot to check
   * @param workingHours - Working hours for the day (startTime and endTime in "HH:mm" format)
   * @returns true if entire slot is within working hours
   */
  static isSlotWithinWorkingHours(
    appointmentSlot: SlotWindow,
    workingHours: {
      startTime: string;
      endTime: string;
    },
  ): boolean {
    const startOk = AppointmentAvailabilityService.isWithinWorkingHours(
      appointmentSlot.getStartTime(),
      workingHours,
    );

    // Check if end time is within or at the boundary of working hours
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);
    const appointmentEndTime = appointmentSlot.getEndTime();
    const appointmentEndInMinutes =
      appointmentEndTime.getHours() * 60 + appointmentEndTime.getMinutes();
    const workEndInMinutes = endHour * 60 + endMin;

    const endOk = appointmentEndInMinutes <= workEndInMinutes;

    return startOk && endOk;
  }

  /**
   * Gets the next available appointment slot for a doctor
   * 
   * @param fromTime - Start searching from this time
   * @param durationMinutes - Required appointment duration
   * @param slotIntervalMinutes - Check at this interval (e.g., 30 minutes)
   * @param workingHours - Doctor's working hours for the day
   * @param breakTimes - Doctor's break times
   * @returns next available slot, or null if none found within reasonable window
   */
  static getNextAvailableSlot(
    fromTime: Date,
    durationMinutes: number,
    slotIntervalMinutes: number,
    workingHours: {
      startTime: string;
      endTime: string;
    },
    breakTimes: SlotWindow[],
  ): SlotWindow | null {
    if (durationMinutes <= 0) {
      throw new DomainException('Duration minutes must be positive', {
        durationMinutes,
      });
    }

    // Search up to 7 days ahead
    const searchLimit = new Date(fromTime.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Round up to next interval
    let currentTime = new Date(fromTime);
    const minutesToRound = currentTime.getMinutes() % slotIntervalMinutes;
    if (minutesToRound !== 0) {
      currentTime.setMinutes(currentTime.getMinutes() + (slotIntervalMinutes - minutesToRound));
    }

    while (currentTime < searchLimit) {
      // If it's a new day, reset to working hours start
      if (
        currentTime.getHours() === 0 &&
        currentTime.getMinutes() < slotIntervalMinutes
      ) {
        const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
        currentTime.setHours(startHour, startMin, 0, 0);
      }

      try {
        const candidateSlot = SlotWindow.fromStartAndDuration({
          startTime: currentTime,
          durationMinutes,
        });

        if (
          AppointmentAvailabilityService.isSlotWithinWorkingHours(
            candidateSlot,
            workingHours,
          ) &&
          AppointmentAvailabilityService.isAvailableDuringSlot(candidateSlot, breakTimes)
        ) {
          return candidateSlot;
        }
      } catch {
        // Invalid slot, continue
      }

      currentTime.setMinutes(currentTime.getMinutes() + slotIntervalMinutes);
    }

    return null; // No available slot found
  }

  /**
   * Checks if a doctor has sufficient buffer time after an appointment
   * 
   * @param appointmentEnd - When the appointment ends
   * @param bufferMinutes - Required buffer time
   * @param nextAppointmentStart - When the next appointment starts
   * @returns true if there's sufficient buffer
   */
  static hasBufferBetweenAppointments(
    appointmentEnd: Date,
    bufferMinutes: number,
    nextAppointmentStart: Date,
  ): boolean {
    const timeBetween = (nextAppointmentStart.getTime() - appointmentEnd.getTime()) / 60_000;
    return timeBetween >= bufferMinutes;
  }

  /**
   * Calculates the free time between two time slots
   * 
   * @param slot1End - When the first slot ends
   * @param slot2Start - When the second slot starts
   * @returns free time in minutes
   */
  static calculateFreetimeBetween(
    slot1End: Date,
    slot2Start: Date,
  ): number {
    if (slot1End >= slot2Start) {
      return 0; // No free time or overlap
    }
    return Math.round((slot2Start.getTime() - slot1End.getTime()) / 60_000);
  }

  /**
   * Checks if a doctor is available within a specific day
   * 
   * @param date - The date to check
   * @param workingHours - Working hours for that day
   * @param breakTimes - Break times for that day
   * @returns true if doctor has any availability
   */
  static hasAvailabilityOnDay(
    date: Date,
    workingHours: {
      startTime: string;
      endTime: string;
    },
    breakTimes: SlotWindow[],
  ): boolean {
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMin, 0, 0);

    // Check if entire working day is covered by breaks
    const totalBreakTime = breakTimes.reduce(
      (sum, breakSlot) => sum + breakSlot.getDurationMinutes(),
      0,
    );

    const workingDayDuration = endHour * 60 + endMin - (startHour * 60 + startMin);

    // If breaks don't fully cover working hours, there's availability
    return totalBreakTime < workingDayDuration;
  }
}
