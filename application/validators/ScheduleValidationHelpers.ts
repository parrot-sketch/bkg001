/**
 * Validation Helpers: ScheduleValidationHelpers
 * 
 * Pure validation functions for schedule rules.
 * Used by use cases to validate schedule configurations.
 * 
 * These are pure functions with no side effects.
 * All validation logic is centralized here for reuse and testing.
 */

/**
 * Check if two time ranges overlap
 * 
 * @param start1 - Start time in minutes (0-1439)
 * @param end1 - End time in minutes (0-1439)
 * @param start2 - Start time in minutes (0-1439)
 * @param end2 - End time in minutes (0-1439)
 * @returns true if ranges overlap
 */
export function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Two ranges overlap if:
  // - start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Convert HH:mm time string to minutes (0-1439)
 * 
 * @param timeStr - Time in HH:mm format
 * @returns Minutes since midnight (0-1439)
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two schedule sessions overlap
 * 
 * @param session1 - First session with startTime and endTime (HH:mm)
 * @param session2 - Second session with startTime and endTime (HH:mm)
 * @returns true if sessions overlap
 */
export function sessionsOverlap(
  session1: { startTime: string; endTime: string },
  session2: { startTime: string; endTime: string }
): boolean {
  const start1 = timeToMinutes(session1.startTime);
  const end1 = timeToMinutes(session1.endTime);
  const start2 = timeToMinutes(session2.startTime);
  const end2 = timeToMinutes(session2.endTime);

  return timeRangesOverlap(start1, end1, start2, end2);
}

/**
 * Check if two date ranges overlap
 * 
 * @param start1 - Start date
 * @param end1 - End date
 * @param start2 - Start date
 * @param end2 - End date
 * @returns true if date ranges overlap
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Normalize to start/end of day for comparison
  const s1 = new Date(start1);
  s1.setHours(0, 0, 0, 0);
  const e1 = new Date(end1);
  e1.setHours(23, 59, 59, 999);
  const s2 = new Date(start2);
  s2.setHours(0, 0, 0, 0);
  const e2 = new Date(end2);
  e2.setHours(23, 59, 59, 999);

  // Two date ranges overlap if:
  // - start1 <= end2 AND start2 <= end1
  return s1 <= e2 && s2 <= e1;
}

/**
 * Check if two dates are on the same calendar day
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}

/**
 * Check if a date falls within a date range (inclusive)
 * 
 * @param date - Date to check
 * @param rangeStart - Range start date
 * @param rangeEnd - Range end date
 * @returns true if date is within range
 */
export function dateInRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 999);
  return checkDate >= start && checkDate <= end;
}

/**
 * Validate that sessions on the same day don't overlap
 * 
 * @param sessions - Array of sessions for a day
 * @param day - Day name (for error messages)
 * @throws DomainException if sessions overlap
 */
export function validateSessionsNoOverlap(
  sessions: Array<{ startTime: string; endTime: string }>,
  day: string
): void {
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (sessionsOverlap(sessions[i], sessions[j])) {
        throw new Error(
          `Sessions overlap on ${day}: ${sessions[i].startTime}-${sessions[i].endTime} overlaps with ${sessions[j].startTime}-${sessions[j].endTime}`
        );
      }
    }
  }
}

/**
 * Check if a block is a full-day block (no time specified)
 */
export function isFullDayBlock(block: {
  startTime?: string | null;
  endTime?: string | null;
}): boolean {
  return !block.startTime || !block.endTime;
}
