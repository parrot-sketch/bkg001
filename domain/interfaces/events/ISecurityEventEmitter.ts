/**
 * Standard Security Events taxonomy
 */
export enum SecurityEventType {
  FAILED_LOGIN = 'auth.login.failed',
  SUCCESSFUL_LOGIN = 'auth.login.success',
  RATE_LIMIT_EXCEEDED = 'security.ratelimit.exceeded',
  ACCOUNT_LOCKED = 'security.account.locked',
  TOKEN_REVOKED = 'auth.token.revoked',
  SESSION_TERMINATED = 'auth.session.terminated'
}

/**
 * Payload metadata for security events
 */
export interface SecurityEventPayload {
  ipAddress: string;
  userAgent?: string;
  email?: string;
  userId?: string;
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Interface defining the Security Event Emitter contract
 * Adheres to Clean Architecture principles by allowing interchangeable backends
 * (e.g., Simple Console, Node Event Emitter, Kafka, AWS EventBridge, Datadog)
 */
export interface ISecurityEventEmitter {
  /**
   * Emit a structured security trace event
   */
  emit(event: SecurityEventType, payload: SecurityEventPayload): void;
}
