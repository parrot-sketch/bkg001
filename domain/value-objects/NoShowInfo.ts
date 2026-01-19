import { NoShowReason } from '../enums/NoShowReason';

/**
 * Value Object: NoShowInfo
 * 
 * Immutable value object representing no-show information.
 * 
 * Invariants:
 * - noShowAt must be a valid date
 * - reason must be a valid NoShowReason
 */
export class NoShowInfo {
  private constructor(
    private readonly noShowAt: Date,
    private readonly reason: NoShowReason,
    private readonly notes: string | undefined,
  ) {}

  /**
   * Creates NoShowInfo
   */
  static create(params: {
    noShowAt: Date;
    reason: NoShowReason;
    notes?: string;
  }): NoShowInfo {
    return new NoShowInfo(
      params.noShowAt,
      params.reason,
      params.notes?.trim(),
    );
  }

  // Getters
  getNoShowAt(): Date {
    return new Date(this.noShowAt);
  }

  getReason(): NoShowReason {
    return this.reason;
  }

  getNotes(): string | undefined {
    return this.notes;
  }

  /**
   * Equality check
   */
  equals(other: NoShowInfo | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.noShowAt.getTime() === other.noShowAt.getTime() &&
      this.reason === other.reason &&
      this.notes === other.notes
    );
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `NoShowInfo(noShowAt=${this.noShowAt.toISOString()}, reason=${this.reason}, notes=${this.notes ?? 'none'})`;
  }
}
