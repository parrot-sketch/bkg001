import { SlotWindow } from '../value-objects/SlotWindow';
import { DomainException } from '../exceptions/DomainException';

/**
 * Domain Service: ConflictDetectionService
 * 
 * Responsible for detecting scheduling conflicts between appointments.
 * Handles complex logic around appointment overlaps, buffer times, and slot constraints.
 * 
 * This service is stateless and focuses on pure business logic.
 * It does not access the database or modify any entities.
 * 
 * Use cases:
 * - Check if a proposed appointment conflicts with existing ones
 * - Check if doctor is available during a time window
 * - Detect overlapping appointments for a patient or doctor
 */
export class ConflictDetectionService {
  /**
   * Checks if two appointments conflict (overlap)
   * 
   * @param appointmentSlot - The new appointment's time slot
   * @param existingSlot - An existing appointment's time slot
   * @param bufferMinutes - Buffer time to maintain between appointments (default 0)
   * @returns true if there is a conflict
   */
  static hasConflict(
    appointmentSlot: SlotWindow,
    existingSlot: SlotWindow,
    bufferMinutes: number = 0,
  ): boolean {
    if (bufferMinutes < 0) {
      throw new DomainException('Buffer minutes cannot be negative', {
        bufferMinutes,
      });
    }

    if (bufferMinutes === 0) {
      return appointmentSlot.overlapsWithSlot(existingSlot);
    }

    // With buffer, extend the existing slot and check overlap
    const bufferedEndTime = new Date(existingSlot.getEndTime().getTime() + bufferMinutes * 60_000);
    const bufferedStartTime = new Date(existingSlot.getStartTime().getTime() - bufferMinutes * 60_000);

    const bufferedSlot = SlotWindow.fromStartAndEnd({
      startTime: bufferedStartTime,
      endTime: bufferedEndTime,
    });

    return appointmentSlot.overlapsWithSlot(bufferedSlot);
  }

  /**
   * Checks if an appointment slot conflicts with any in a list of existing slots
   * 
   * @param appointmentSlot - The new appointment's time slot
   * @param existingSlots - Array of existing appointment slots
   * @param bufferMinutes - Buffer time to maintain between appointments
   * @returns object with conflict status and conflicting slots
   */
  static findConflicts(
    appointmentSlot: SlotWindow,
    existingSlots: SlotWindow[],
    bufferMinutes: number = 0,
  ): {
    hasConflicts: boolean;
    conflictingSlots: SlotWindow[];
  } {
    const conflictingSlots = existingSlots.filter((slot) =>
      ConflictDetectionService.hasConflict(appointmentSlot, slot, bufferMinutes)
    );

    return {
      hasConflicts: conflictingSlots.length > 0,
      conflictingSlots,
    };
  }

  /**
   * Checks if a time slot is available (no conflicts)
   * 
   * @param slot - The time slot to check
   * @param existingSlots - Array of existing appointment slots
   * @param bufferMinutes - Buffer time to maintain between appointments
   * @returns true if slot is available (no conflicts)
   */
  static isSlotAvailable(
    slot: SlotWindow,
    existingSlots: SlotWindow[],
    bufferMinutes: number = 0,
  ): boolean {
    const { hasConflicts } = ConflictDetectionService.findConflicts(
      slot,
      existingSlots,
      bufferMinutes,
    );
    return !hasConflicts;
  }

  /**
   * Finds all available slots within a given time range
   * 
   * @param timeRange - The overall time range to search
   * @param slotDurationMinutes - Duration of each slot to find
   * @param existingSlots - Array of existing appointment slots
   * @param bufferMinutes - Buffer time between slots
   * @param slotIntervalMinutes - Interval at which to check for available slots (e.g., 30 min intervals)
   * @returns Array of available SlotWindows
   */
  static findAvailableSlots(
    timeRange: SlotWindow,
    slotDurationMinutes: number,
    existingSlots: SlotWindow[],
    bufferMinutes: number = 0,
    slotIntervalMinutes: number = 30,
  ): SlotWindow[] {
    if (slotDurationMinutes <= 0) {
      throw new DomainException('Slot duration must be positive', {
        slotDurationMinutes,
      });
    }

    if (slotIntervalMinutes <= 0) {
      throw new DomainException('Slot interval must be positive', {
        slotIntervalMinutes,
      });
    }

    const availableSlots: SlotWindow[] = [];
    const rangeStart = timeRange.getStartTime().getTime();
    const rangeEnd = timeRange.getEndTime().getTime();

    // Iterate through the range in intervals
    for (
      let currentTime = rangeStart;
      currentTime + slotDurationMinutes * 60_000 <= rangeEnd;
      currentTime += slotIntervalMinutes * 60_000
    ) {
      const candidateSlot = SlotWindow.fromStartAndDuration({
        startTime: new Date(currentTime),
        durationMinutes: slotDurationMinutes,
      });

      if (ConflictDetectionService.isSlotAvailable(candidateSlot, existingSlots, bufferMinutes)) {
        availableSlots.push(candidateSlot);
      }
    }

    return availableSlots;
  }

  /**
   * Checks if a doctor's schedule is overbooked at a given time
   * Useful for identifying when a doctor has too many back-to-back appointments
   * 
   * @param timeSlot - The time slot to check
   * @param existingSlots - Array of existing appointment slots
   * @param maxConsecutiveSlots - Maximum consecutive appointments allowed
   * @returns true if overbooked
   */
  static isOverbookedAt(
    timeSlot: SlotWindow,
    existingSlots: SlotWindow[],
    maxConsecutiveSlots: number = 4,
  ): boolean {
    const { conflictingSlots } = ConflictDetectionService.findConflicts(
      timeSlot,
      existingSlots,
      0,
    );

    // Count how many existing slots are adjacent to this time slot
    // (forming a block of consecutive appointments)
    let consecutiveCount = conflictingSlots.length;

    for (const existingSlot of existingSlots) {
      if (timeSlot.isAdjacentTo(existingSlot)) {
        consecutiveCount++;
      }
    }

    return consecutiveCount > maxConsecutiveSlots;
  }

  /**
   * Calculates the total busy time in a range for a doctor
   * 
   * @param timeRange - The overall time range to analyze
   * @param existingSlots - Array of existing appointment slots
   * @returns object with busy minutes and utilization percentage
   */
  static calculateBusyTime(
    timeRange: SlotWindow,
    existingSlots: SlotWindow[],
  ): {
    busyMinutes: number;
    freeMinutes: number;
    utilizationPercentage: number;
  } {
    let totalBusyMinutes = 0;

    for (const slot of existingSlots) {
      if (timeRange.containsSlot(slot)) {
        totalBusyMinutes += slot.getDurationMinutes();
      } else if (
        slot.getStartTime() < timeRange.getEndTime() &&
        slot.getEndTime() > timeRange.getStartTime()
      ) {
        // Partial overlap
        const overlapStart = Math.max(
          slot.getStartTime().getTime(),
          timeRange.getStartTime().getTime(),
        );
        const overlapEnd = Math.min(
          slot.getEndTime().getTime(),
          timeRange.getEndTime().getTime(),
        );
        totalBusyMinutes += Math.round((overlapEnd - overlapStart) / 60_000);
      }
    }

    const freeMinutes = timeRange.getDurationMinutes() - totalBusyMinutes;
    const utilizationPercentage = Math.round(
      (totalBusyMinutes / timeRange.getDurationMinutes()) * 100,
    );

    return {
      busyMinutes: totalBusyMinutes,
      freeMinutes: Math.max(0, freeMinutes),
      utilizationPercentage,
    };
  }
}
