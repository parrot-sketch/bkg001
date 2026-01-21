/**
 * Domain Service: AvailabilitySlotService
 * 
 * Generates available time slots from doctor availability.
 * This is domain logic that doesn't belong in entities or use cases.
 */

import { WorkingDay, AvailabilityOverride, AvailabilityBreak, SlotConfiguration } from '../interfaces/repositories/IAvailabilityRepository';
import { Appointment } from '../entities/Appointment';

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  isAvailable: boolean;
}

export class AvailabilitySlotService {
  /**
   * Generate available slots for a specific date
   */
  static generateSlotsForDate(
    date: Date,
    workingDays: WorkingDay[],
    overrides: AvailabilityOverride[],
    breaks: AvailabilityBreak[],
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): AvailableSlot[] {
    const dayOfWeek = this.getDayOfWeek(date);
    const workingDay = workingDays.find((wd) => wd.day === dayOfWeek && wd.isAvailable);

    if (!workingDay) {
      return []; // Doctor doesn't work on this day
    }

    // Check if date is blocked by override
    const isBlocked = overrides.some((ov) => {
      const ovStart = new Date(ov.startDate);
      ovStart.setHours(0, 0, 0, 0);
      const ovEnd = new Date(ov.endDate);
      ovEnd.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return ov.isBlocked && checkDate >= ovStart && checkDate <= ovEnd;
    });

    if (isBlocked) {
      return []; // Date is blocked
    }

    // Get breaks for this day
    const dayBreaks = breaks.filter((br) => {
      if (br.workingDayId) {
        return false; // Will be filtered by working day ID if needed
      }
      return br.dayOfWeek === dayOfWeek;
    });

    // Generate slots
    const slots: AvailableSlot[] = [];
    const [startHour, startMinute] = workingDay.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingDay.endTime.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotConfig.defaultDuration);

      if (slotEnd > endTime) {
        break; // Slot would extend beyond working hours
      }

      // Check if slot conflicts with breaks
      const conflictsWithBreak = dayBreaks.some((br) => {
        const [brStartHour, brStartMin] = br.startTime.split(':').map(Number);
        const [brEndHour, brEndMin] = br.endTime.split(':').map(Number);
        const brStart = new Date(date);
        brStart.setHours(brStartHour, brStartMin, 0, 0);
        const brEnd = new Date(date);
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
        const aptTime = apt.getTime(); // HH:mm format
        const [aptHour, aptMin] = aptTime.split(':').map(Number);
        aptDate.setHours(aptHour, aptMin, 0, 0);

        const aptEnd = new Date(aptDate);
        // Use default duration if slot duration not available (Appointment entity doesn't expose it yet)
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
      });

      // Move to next slot (with buffer time)
      currentTime.setMinutes(currentTime.getMinutes() + slotConfig.slotInterval);
    }

    return slots;
  }

  /**
   * Check if a time slot is available
   */
  static isSlotAvailable(
    date: Date,
    time: string, // HH:mm
    duration: number, // minutes
    workingDays: WorkingDay[],
    overrides: AvailabilityOverride[],
    breaks: AvailabilityBreak[],
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): { isAvailable: boolean; reason?: string } {
    const slots = this.generateSlotsForDate(
      date,
      workingDays,
      overrides,
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
    const matchingSlot = slots.find((slot) => {
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

    // Check override
    const isBlocked = overrides.some((ov) => {
      const ovStart = new Date(ov.startDate);
      ovStart.setHours(0, 0, 0, 0);
      const ovEnd = new Date(ov.endDate);
      ovEnd.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return ov.isBlocked && checkDate >= ovStart && checkDate <= ovEnd;
    });

    if (isBlocked) {
      return { isAvailable: false, reason: 'Doctor is unavailable on this date' };
    }

    // Check working hours
    const [startHour, startMin] = workingDay.startTime.split(':').map(Number);
    const [endHour, endMin] = workingDay.endTime.split(':').map(Number);
    const workStart = new Date(date);
    workStart.setHours(startHour, startMin, 0, 0);
    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMin, 0, 0);

    if (requestedStart < workStart || requestedEnd > workEnd) {
      return { isAvailable: false, reason: 'Time is outside working hours' };
    }

    // Check breaks
    const dayBreaks = breaks.filter((br) => br.dayOfWeek === dayOfWeek);
    const conflictsWithBreak = dayBreaks.some((br) => {
      const [brStartHour, brStartMin] = br.startTime.split(':').map(Number);
      const [brEndHour, brEndMin] = br.endTime.split(':').map(Number);
      const brStart = new Date(date);
      brStart.setHours(brStartHour, brStartMin, 0, 0);
      const brEnd = new Date(date);
      brEnd.setHours(brEndHour, brEndMin, 0, 0);

      return (
        (requestedStart >= brStart && requestedStart < brEnd) ||
        (requestedEnd > brStart && requestedEnd <= brEnd) ||
        (requestedStart <= brStart && requestedEnd >= brEnd)
      );
    });

    if (conflictsWithBreak) {
      return { isAvailable: false, reason: 'Time conflicts with break period' };
    }

    // Check existing appointments
    const conflictsWithAppointment = existingAppointments.some((apt) => {
      const aptDate = new Date(apt.getAppointmentDate());
      const aptTime = apt.getTime();
      const [aptHour, aptMin] = aptTime.split(':').map(Number);
      aptDate.setHours(aptHour, aptMin, 0, 0);

      const aptEnd = new Date(aptDate);
      // Use default duration if slot duration not available (Appointment entity doesn't expose it yet)
      aptEnd.setMinutes(aptEnd.getMinutes() + slotConfig.defaultDuration);

      return (
        (requestedStart >= aptDate && requestedStart < aptEnd) ||
        (requestedEnd > aptDate && requestedEnd <= aptEnd) ||
        (requestedStart <= aptDate && requestedEnd >= aptEnd)
      );
    });

    if (conflictsWithAppointment) {
      return { isAvailable: false, reason: 'Time slot is already booked' };
    }

    return { isAvailable: false, reason: 'Time slot is not available' };
  }

  private static getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }
}
