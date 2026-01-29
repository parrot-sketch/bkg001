import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: SlotWindow
 * 
 * Immutable value object representing a time slot window.
 * Used for appointment scheduling, availability checking, and conflict detection.
 * 
 * Invariants:
 * - startTime must be before endTime
 * - startTime and endTime must be valid dates
 * - Duration must be positive
 */
export class SlotWindow {
  private constructor(
    private readonly startTime: Date,
    private readonly endTime: Date,
    private readonly durationMinutes: number,
  ) {
    // All invariants are enforced in the factory methods
  }

  /**
   * Creates a SlotWindow from a start time and duration
   * 
   * @param params - { startTime: Date, durationMinutes: number }
   * @returns SlotWindow instance
   * @throws DomainException if validation fails
   */
  static fromStartAndDuration(params: {
    startTime: Date;
    durationMinutes: number;
  }): SlotWindow {
    if (!params.startTime || !(params.startTime instanceof Date)) {
      throw new DomainException('Start time must be a valid Date', {
        providedValue: params.startTime,
      });
    }

    if (!Number.isInteger(params.durationMinutes) || params.durationMinutes <= 0) {
      throw new DomainException('Duration minutes must be a positive integer', {
        providedValue: params.durationMinutes,
      });
    }

    if (params.durationMinutes > 480) {
      // 8 hours max
      throw new DomainException('Duration minutes cannot exceed 8 hours (480 minutes)', {
        providedValue: params.durationMinutes,
      });
    }

    const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60_000);

    return new SlotWindow(params.startTime, endTime, params.durationMinutes);
  }

  /**
   * Creates a SlotWindow from start and end times
   * 
   * @param params - { startTime: Date, endTime: Date }
   * @returns SlotWindow instance
   * @throws DomainException if validation fails
   */
  static fromStartAndEnd(params: {
    startTime: Date;
    endTime: Date;
  }): SlotWindow {
    if (!params.startTime || !(params.startTime instanceof Date)) {
      throw new DomainException('Start time must be a valid Date', {
        providedValue: params.startTime,
      });
    }

    if (!params.endTime || !(params.endTime instanceof Date)) {
      throw new DomainException('End time must be a valid Date', {
        providedValue: params.endTime,
      });
    }

    if (params.startTime >= params.endTime) {
      throw new DomainException('Start time must be before end time', {
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
      });
    }

    const durationMinutes = Math.round(
      (params.endTime.getTime() - params.startTime.getTime()) / 60_000
    );

    if (durationMinutes <= 0) {
      throw new DomainException('Duration must be positive', {
        durationMinutes,
      });
    }

    return new SlotWindow(params.startTime, params.endTime, durationMinutes);
  }

  /**
   * Creates a SlotWindow from a scheduled_at datetime and duration
   * This is the Phase 1 canonical field method
   */
  static fromScheduledAt(params: {
    scheduledAt: Date;
    durationMinutes: number;
  }): SlotWindow {
    return SlotWindow.fromStartAndDuration({
      startTime: params.scheduledAt,
      durationMinutes: params.durationMinutes,
    });
  }

  /**
   * Checks if this slot overlaps with another slot
   * 
   * @param other - Another SlotWindow
   * @returns true if the slots overlap
   */
  overlapsWithSlot(other: SlotWindow): boolean {
    // Slots overlap if:
    // - This slot starts before other ends AND
    // - This slot ends after other starts
    return this.startTime < other.getEndTime() && this.endTime > other.getStartTime();
  }

  /**
   * Checks if this slot is adjacent to another slot (touching but not overlapping)
   * 
   * @param other - Another SlotWindow
   * @returns true if slots are adjacent (end of one equals start of other)
   */
  isAdjacentTo(other: SlotWindow): boolean {
    return this.endTime.getTime() === other.getStartTime().getTime() ||
           other.getEndTime().getTime() === this.startTime.getTime();
  }

  /**
   * Checks if this slot contains another slot (other is completely within this)
   * 
   * @param other - Another SlotWindow
   * @returns true if other is completely within this slot
   */
  containsSlot(other: SlotWindow): boolean {
    return this.startTime <= other.getStartTime() && this.endTime >= other.getEndTime();
  }

  /**
   * Checks if this slot is contained within another slot
   * 
   * @param other - Another SlotWindow
   * @returns true if this slot is completely within other
   */
  isContainedIn(other: SlotWindow): boolean {
    return other.containsSlot(this);
  }

  /**
   * Checks if a specific point in time falls within this slot
   * 
   * @param time - Date to check
   * @returns true if time is within the slot (inclusive of start, exclusive of end)
   */
  containsTime(time: Date): boolean {
    return time >= this.startTime && time < this.endTime;
  }

  /**
   * Checks if this slot is in the past
   * 
   * @param now - Current date (defaults to now)
   * @returns true if slot end time is in the past
   */
  isPast(now: Date = new Date()): boolean {
    return this.endTime <= now;
  }

  /**
   * Checks if this slot is in the future
   * 
   * @param now - Current date (defaults to now)
   * @returns true if slot start time is in the future
   */
  isFuture(now: Date = new Date()): boolean {
    return this.startTime > now;
  }

  /**
   * Checks if this slot overlaps with another or is adjacent
   * Useful for checking if a slot blocks time
   * 
   * @param other - Another SlotWindow
   * @returns true if slots conflict (overlap or adjacent)
   */
  conflictsWith(other: SlotWindow, allowAdjacentSlots: boolean = false): boolean {
    if (allowAdjacentSlots) {
      return this.overlapsWithSlot(other);
    }
    return this.overlapsWithSlot(other) || this.isAdjacentTo(other);
  }

  // Getters
  getStartTime(): Date {
    return new Date(this.startTime);
  }

  getEndTime(): Date {
    return new Date(this.endTime);
  }

  getDurationMinutes(): number {
    return this.durationMinutes;
  }

  /**
   * Get the midpoint of the slot
   */
  getMidpoint(): Date {
    const midpointMs = this.startTime.getTime() + (this.durationMinutes * 60_000) / 2;
    return new Date(midpointMs);
  }

  /**
   * Equality check based on start time, end time, and duration
   */
  equals(other: SlotWindow | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.startTime.getTime() === other.getStartTime().getTime() &&
      this.endTime.getTime() === other.getEndTime().getTime() &&
      this.durationMinutes === other.getDurationMinutes()
    );
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `SlotWindow(${this.startTime.toISOString()} - ${this.endTime.toISOString()}, ${this.durationMinutes}min)`;
  }
}
