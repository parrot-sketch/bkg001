import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: ConsultationDuration
 * 
 * Immutable value object representing consultation duration.
 * 
 * Invariants:
 * - minutes must be non-negative
 * - seconds must be between 0 and 59
 */
export class ConsultationDuration {
  private constructor(
    private readonly minutes: number,
    private readonly seconds: number,
  ) {
    if (minutes < 0) {
      throw new DomainException('Duration minutes cannot be negative', {
        minutes,
      });
    }
    if (seconds < 0 || seconds >= 60) {
      throw new DomainException('Duration seconds must be between 0 and 59', {
        seconds,
      });
    }
  }

  /**
   * Calculates duration from start and end times
   */
  static calculate(startedAt: Date, completedAt: Date): ConsultationDuration {
    const diffMs = completedAt.getTime() - startedAt.getTime();
    if (diffMs < 0) {
      throw new DomainException('Completed time must be after started time', {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      });
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return new ConsultationDuration(minutes, seconds);
  }

  /**
   * Creates duration from total minutes
   */
  static fromMinutes(minutes: number): ConsultationDuration {
    if (minutes < 0) {
      throw new DomainException('Minutes cannot be negative', {
        minutes,
      });
    }
    return new ConsultationDuration(Math.floor(minutes), 0);
  }

  /**
   * Creates duration from total seconds
   */
  static fromSeconds(totalSeconds: number): ConsultationDuration {
    if (totalSeconds < 0) {
      throw new DomainException('Total seconds cannot be negative', {
        totalSeconds,
      });
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return new ConsultationDuration(minutes, seconds);
  }

  // Getters
  getMinutes(): number {
    return this.minutes;
  }

  getSeconds(): number {
    return this.seconds;
  }

  getTotalMinutes(): number {
    return this.minutes + this.seconds / 60;
  }

  getTotalSeconds(): number {
    return this.minutes * 60 + this.seconds;
  }

  /**
   * Format as human-readable string
   */
  toString(): string {
    if (this.minutes === 0) {
      return `${this.seconds}s`;
    }
    if (this.seconds === 0) {
      return `${this.minutes}m`;
    }
    return `${this.minutes}m ${this.seconds}s`;
  }

  /**
   * Format as HH:MM:SS
   */
  toTimeString(): string {
    const hours = Math.floor(this.minutes / 60);
    const mins = this.minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${this.seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Equality check
   */
  equals(other: ConsultationDuration | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.minutes === other.minutes && this.seconds === other.seconds;
  }
}
