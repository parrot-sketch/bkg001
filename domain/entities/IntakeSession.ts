import { DomainException } from '@/domain/exceptions/DomainException';

export type IntakeSessionStatus = 'ACTIVE' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED';

/**
 * Entity: IntakeSession
 *
 * Represents a patient intake session initiated by frontdesk.
 * Tracks the lifecycle: ACTIVE → SUBMITTED → CONFIRMED or EXPIRED
 *
 * Business Rules:
 * - Session is ACTIVE when created
 * - Session expires after specified minutes (default 60)
 * - Once SUBMITTED, cannot accept new submissions
 * - Once CONFIRMED, session is closed
 * - Expired sessions cannot be reactivated
 */
export class IntakeSession {
  private readonly sessionId: string;
  private readonly status: IntakeSessionStatus;
  private readonly createdAt: Date;
  private readonly expiresAt: Date;
  private readonly createdByUserId?: string;

  private constructor(
    sessionId: string,
    status: IntakeSessionStatus,
    createdAt: Date,
    expiresAt: Date,
    createdByUserId?: string,
  ) {
    this.sessionId = sessionId;
    this.status = status;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.createdByUserId = createdByUserId;
  }

  /**
   * Factory method: Create a new intake session
   *
   * @param params Configuration for new session
   * @param params.sessionId Unique session identifier (UUID)
   * @param params.createdByUserId ID of frontdesk user who initiated
   * @param params.expirationMinutes How long session remains active (default: 60)
   * @returns New IntakeSession instance
   *
   * @example
   * const session = IntakeSession.create({
   *   sessionId: uuidv4(),
   *   createdByUserId: 'user-123',
   *   expirationMinutes: 60,
   * });
   */
  static create(params: {
    sessionId: string;
    createdByUserId?: string;
    expirationMinutes?: number;
  }): IntakeSession {
    // Validate sessionId
    if (!params.sessionId || params.sessionId.trim().length === 0) {
      throw new DomainException('Session ID is required');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    const expirationMinutes = params.expirationMinutes ?? 60;
    
    if (expirationMinutes <= 0) {
      throw new DomainException('Expiration time must be greater than 0');
    }
    
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    return new IntakeSession(
      params.sessionId,
      'ACTIVE',
      new Date(),
      expiresAt,
      params.createdByUserId,
    );
  }

  /**
   * Restore IntakeSession from persistent storage
   * Used by repositories when loading from database
   */
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

  /**
   * Check if session has expired
   *
   * @returns true if current time is past expiresAt
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session is active and not expired
   */
  isActive(): boolean {
    return this.status === 'ACTIVE' && !this.isExpired();
  }

  /**
   * Check if session is still accepting submissions
   *
   * @returns true if session is ACTIVE and not expired
   */
  canAcceptSubmission(): boolean {
    return this.isActive();
  }

  /**
   * Mark session as submitted
   * Called when patient submits intake form
   *
   * @throws DomainException if session is not ACTIVE
   */
  markAsSubmitted(): void {
    if (this.status !== 'ACTIVE') {
      throw new DomainException(
        `Cannot submit to session with status ${this.status}`,
      );
    }

    if (this.isExpired()) {
      throw new DomainException('Session has expired');
    }

    // Note: We can't actually change status in an immutable entity
    // This method demonstrates the intent; implementation uses repository
  }

  /**
   * Mark session as confirmed
   * Called when frontdesk confirms intake and creates patient record
   *
   * @throws DomainException if session is not SUBMITTED
   */
  markAsConfirmed(): void {
    if (this.status !== 'SUBMITTED') {
      throw new DomainException(
        `Cannot confirm session with status ${this.status}`,
      );
    }
  }

  /**
   * Mark session as expired
   * Called by cleanup job or when expiration is detected
   */
  markAsExpired(): void {
    if (this.status === 'CONFIRMED') {
      throw new DomainException('Cannot expire a confirmed session');
    }
  }

  /**
   * Get time remaining until session expires
   *
   * @returns Milliseconds remaining, or 0 if expired
   */
  getTimeRemaining(): number {
    const remaining = this.expiresAt.getTime() - new Date().getTime();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get time remaining in minutes
   */
  getMinutesRemaining(): number {
    return Math.ceil(this.getTimeRemaining() / 60000);
  }

  // ============================================================================
  // Getters (all properties are immutable)
  // ============================================================================

  getSessionId(): string {
    return this.sessionId;
  }

  getStatus(): IntakeSessionStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt); // Return copy to prevent mutation
  }

  getExpiresAt(): Date {
    return new Date(this.expiresAt);
  }

  getCreatedByUserId(): string | undefined {
    return this.createdByUserId;
  }

  /**
   * Serialize to plain object for DTO/API responses
   */
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
}
