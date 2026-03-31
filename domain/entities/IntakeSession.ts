import {
  InvalidSessionStateError,
  SessionExpiredError,
} from '@/domain/errors/IntakeErrors';

export type IntakeSessionStatus = 'ACTIVE' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED';

/**
 * Entity: IntakeSession
 *
 * Represents a patient intake session initiated by frontdesk.
 * Tracks the lifecycle: ACTIVE → SUBMITTED → CONFIRMED or EXPIRED
 *
 * Immutable: all state transitions return NEW instances.
 */
export class IntakeSession {
  private constructor(
    private readonly sessionId: string,
    private readonly status: IntakeSessionStatus,
    private readonly createdAt: Date,
    private readonly expiresAt: Date,
    private readonly createdByUserId: string | undefined,
  ) {}

  static create(params: {
    sessionId: string;
    createdByUserId?: string;
    expirationMinutes?: number;
  }): IntakeSession {
    if (!params.sessionId || params.sessionId.trim().length === 0) {
      throw new InvalidSessionStateError('', 'EMPTY', 'valid sessionId');
    }

    const expMin = params.expirationMinutes ?? 60;
    if (expMin < 15 || expMin > 1440) {
      throw new InvalidSessionStateError(
        params.sessionId,
        `${expMin}min`,
        '15-1440 minutes',
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expMin);

    return new IntakeSession(
      params.sessionId,
      'ACTIVE',
      new Date(),
      expiresAt,
      params.createdByUserId,
    );
  }

  static restore(data: {
    sessionId: string;
    status: IntakeSessionStatus;
    createdAt: Date;
    expiresAt: Date;
    createdByUserId?: string;
  }): IntakeSession {
    return new IntakeSession(
      data.sessionId,
      data.status,
      data.createdAt,
      data.expiresAt,
      data.createdByUserId,
    );
  }

  // ── Pure state transitions (return new instance) ──

  markAsSubmitted(): IntakeSession {
    this.assertStatus('ACTIVE');
    this.assertNotExpired();
    return this.withStatus('SUBMITTED');
  }

  markAsConfirmed(): IntakeSession {
    this.assertStatus('SUBMITTED');
    return this.withStatus('CONFIRMED');
  }

  markAsExpired(): IntakeSession {
    if (this.status === 'CONFIRMED') {
      throw new InvalidSessionStateError(this.sessionId, 'CONFIRMED', 'not CONFIRMED');
    }
    return this.withStatus('EXPIRED');
  }

  // ── Business logic ──

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE' && !this.isExpired();
  }

  canAcceptSubmission(): boolean {
    return this.isActive();
  }

  getTimeRemaining(): number {
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }

  getMinutesRemaining(): number {
    return Math.ceil(this.getTimeRemaining() / 60000);
  }

  // ── Getters ──

  getSessionId(): string { return this.sessionId; }
  getStatus(): IntakeSessionStatus { return this.status; }
  getCreatedAt(): Date { return new Date(this.createdAt); }
  getExpiresAt(): Date { return new Date(this.expiresAt); }
  getCreatedByUserId(): string | undefined { return this.createdByUserId; }

  // ── Serialization ──

  toPrimitive() {
    return {
      sessionId: this.sessionId,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      createdByUserId: this.createdByUserId,
      isExpired: this.isExpired(),
      minutesRemaining: this.getMinutesRemaining(),
    };
  }

  // ── Private helpers ──

  private assertStatus(expected: IntakeSessionStatus): void {
    if (this.status !== expected) {
      throw new InvalidSessionStateError(this.sessionId, this.status, expected);
    }
  }

  private assertNotExpired(): void {
    if (this.isExpired()) {
      throw new SessionExpiredError(this.sessionId);
    }
  }

  private withStatus(newStatus: IntakeSessionStatus): IntakeSession {
    return new IntakeSession(
      this.sessionId,
      newStatus,
      this.createdAt,
      this.expiresAt,
      this.createdByUserId,
    );
  }
}
