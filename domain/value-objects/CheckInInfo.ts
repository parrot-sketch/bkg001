import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: CheckInInfo
 * 
 * Immutable value object representing patient check-in information.
 * 
 * Invariants:
 * - checkedInBy must not be empty
 * - If lateArrival is true, lateByMinutes must be positive
 * - If lateArrival is false, lateByMinutes must be undefined
 */
export class CheckInInfo {
  private constructor(
    private readonly checkedInAt: Date,
    private readonly checkedInBy: string, // User ID
    private readonly lateArrival: boolean,
    private readonly lateByMinutes: number | undefined,
  ) {
    // Invariants enforced in constructor
    if (!checkedInBy || checkedInBy.trim().length === 0) {
      throw new DomainException('Checked in by user ID is required', {
        checkedInBy,
      });
    }
    if (lateArrival && (!lateByMinutes || lateByMinutes <= 0)) {
      throw new DomainException(
        'Late by minutes must be positive if late arrival is true',
        { lateArrival, lateByMinutes }
      );
    }
    if (!lateArrival && lateByMinutes !== undefined) {
      throw new DomainException(
        'Late by minutes should not be set if not late arrival',
        { lateArrival, lateByMinutes }
      );
    }
  }

  /**
   * Creates CheckInInfo for on-time arrival
   */
  static createOnTime(params: {
    checkedInAt: Date;
    checkedInBy: string;
  }): CheckInInfo {
    return new CheckInInfo(
      params.checkedInAt,
      params.checkedInBy.trim(),
      false,
      undefined,
    );
  }

  /**
   * Creates CheckInInfo for late arrival
   */
  static createLate(params: {
    checkedInAt: Date;
    checkedInBy: string;
    lateByMinutes: number;
  }): CheckInInfo {
    if (params.lateByMinutes <= 0) {
      throw new DomainException('Late by minutes must be positive', {
        lateByMinutes: params.lateByMinutes,
      });
    }
    return new CheckInInfo(
      params.checkedInAt,
      params.checkedInBy.trim(),
      true,
      params.lateByMinutes,
    );
  }

  /**
   * Creates CheckInInfo with explicit parameters
   */
  static create(params: {
    checkedInAt: Date;
    checkedInBy: string;
    lateArrival?: boolean;
    lateByMinutes?: number;
  }): CheckInInfo {
    return new CheckInInfo(
      params.checkedInAt,
      params.checkedInBy.trim(),
      params.lateArrival ?? false,
      params.lateArrival ? params.lateByMinutes : undefined,
    );
  }

  // Getters
  getCheckedInAt(): Date {
    return new Date(this.checkedInAt);
  }

  getCheckedInBy(): string {
    return this.checkedInBy;
  }

  isLate(): boolean {
    return this.lateArrival;
  }

  getLateByMinutes(): number | undefined {
    return this.lateByMinutes;
  }

  /**
   * Equality check
   */
  equals(other: CheckInInfo | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.checkedInAt.getTime() === other.checkedInAt.getTime() &&
      this.checkedInBy === other.checkedInBy &&
      this.lateArrival === other.lateArrival &&
      this.lateByMinutes === other.lateByMinutes
    );
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    if (this.lateArrival) {
      return `CheckInInfo(checkedInAt=${this.checkedInAt.toISOString()}, checkedInBy=${this.checkedInBy}, late=${this.lateByMinutes}min)`;
    }
    return `CheckInInfo(checkedInAt=${this.checkedInAt.toISOString()}, checkedInBy=${this.checkedInBy}, onTime)`;
  }
}
