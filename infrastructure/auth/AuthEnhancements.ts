/**
 * Auth Service Enhancements
 * 
 * Additional utilities and services to make authentication more:
 * - Robust (error handling, validation, constraints)
 * - Modular (separated concerns)
 * - Scalable (rate limiting, session management)
 * - Testable (injectable dependencies)
 * - Maintainable (clear interfaces, documentation)
 */

/**
 * Authentication Error Codes
 * For structured error handling and client-side error messages
 */
export enum AuthErrorCode {
  // Authentication Failures
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',

  // Token Errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',

  // Validation Errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  EMAIL_REQUIRED = 'EMAIL_REQUIRED',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',

  // Authorization Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_ALLOWED = 'ROLE_NOT_ALLOWED',
  MFA_REQUIRED = 'MFA_REQUIRED',

  // Rate Limiting
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  ACCOUNT_TEMPORARILY_LOCKED = 'ACCOUNT_TEMPORARILY_LOCKED',

  // Onboarding
  DOCTOR_NOT_ONBOARDED = 'DOCTOR_NOT_ONBOARDED',
  ONBOARDING_INCOMPLETE = 'ONBOARDING_INCOMPLETE',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Auth Exception with Error Code
 * Enables structured error handling across layers
 */
export class AuthException extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly message: string,
    public readonly details?: Record<string, any>,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthException';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Password Validation Service
 * Enforces password strength requirements
 */
export class PasswordValidator {
  // Password Requirements
  private readonly MIN_LENGTH = 8;
  private readonly MAX_LENGTH = 128;
  private readonly REQUIRE_UPPERCASE = true;
  private readonly REQUIRE_LOWERCASE = true;
  private readonly REQUIRE_NUMBERS = true;
  private readonly REQUIRE_SPECIAL_CHARS = true;

  /**
   * Validate password strength
   * @throws AuthException if password doesn't meet requirements
   */
  validate(password: string): void {
    // Check length
    if (!password || password.length < this.MIN_LENGTH) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_SHORT,
        `Password must be at least ${this.MIN_LENGTH} characters`,
      );
    }

    if (password.length > this.MAX_LENGTH) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        `Password must not exceed ${this.MAX_LENGTH} characters`,
      );
    }

    // Check uppercase
    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must contain at least one uppercase letter',
      );
    }

    // Check lowercase
    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must contain at least one lowercase letter',
      );
    }

    // Check numbers
    if (this.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must contain at least one number',
      );
    }

    // Check special characters
    if (this.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must contain at least one special character',
      );
    }
  }

  /**
   * Calculate password strength score (0-100)
   * Useful for frontend password strength meter
   */
  calculateStrength(password: string): number {
    if (!password) return 0;

    let score = 0;

    // Length
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

    return Math.min(score, 100);
  }
}

/**
 * Login Attempt Tracker
 * Prevents brute force attacks with rate limiting
 */
export interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
}

export class RateLimitService {
  private readonly attempts: Map<string, LoginAttempt[]> = new Map();
  private readonly MAX_ATTEMPTS = 5; // 5 attempts
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

  /**
   * Record a login attempt
   */
  recordAttempt(email: string, success: boolean): void {
    if (!this.attempts.has(email)) {
      this.attempts.set(email, []);
    }

    const userAttempts = this.attempts.get(email)!;
    userAttempts.push({
      email,
      timestamp: new Date(),
      success,
    });

    // Cleanup old attempts
    const cutoff = Date.now() - this.ATTEMPT_WINDOW;
    const filtered = userAttempts.filter(a => a.timestamp.getTime() > cutoff);
    this.attempts.set(email, filtered);
  }

  /**
   * Check if user is rate limited
   */
  isRateLimited(email: string): { limited: boolean; unlocksAt?: Date } {
    const userAttempts = this.attempts.get(email) || [];

    if (userAttempts.length === 0) {
      return { limited: false };
    }

    // Count failed attempts
    const failedAttempts = userAttempts.filter(a => !a.success);

    if (failedAttempts.length >= this.MAX_ATTEMPTS) {
      const lastAttempt = failedAttempts[failedAttempts.length - 1];
      const unlocksAt = new Date(lastAttempt.timestamp.getTime() + this.LOCKOUT_DURATION);

      if (unlocksAt.getTime() > Date.now()) {
        return { limited: true, unlocksAt };
      }
    }

    return { limited: false };
  }

  /**
   * Clear attempts for user (on successful login)
   */
  clearAttempts(email: string): void {
    this.attempts.delete(email);
  }

  /**
   * Reset all attempts (for testing)
   */
  reset(): void {
    this.attempts.clear();
  }
}

/**
 * Auth Audit Logger
 * Logs all authentication events for compliance and debugging
 */
export enum AuthAuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_RATE_LIMITED = 'LOGIN_RATE_LIMITED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
}

export interface AuthAuditEvent {
  eventType: AuthAuditEventType;
  userId?: string;
  email?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface IAuditLogger {
  log(event: AuthAuditEvent): Promise<void>;
  getAuditTrail(userId: string, limit?: number): Promise<AuthAuditEvent[]>;
}

/**
 * In-Memory Audit Logger (for development)
 */
export class InMemoryAuditLogger implements IAuditLogger {
  private events: AuthAuditEvent[] = [];

  async log(event: AuthAuditEvent): Promise<void> {
    this.events.push(event);
    console.log('[AUTH AUDIT]', event);
  }

  async getAuditTrail(userId: string, limit = 100): Promise<AuthAuditEvent[]> {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Session Manager
 * Manages user sessions and their metadata
 */
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();

  /**
   * Create a new session
   */
  createSession(
    token: string,
    data: Omit<SessionData, 'createdAt' | 'expiresAt'>,
    expiresIn: number,
  ): SessionData {
    const session: SessionData = {
      ...data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };

    this.sessions.set(token, session);
    return session;
  }

  /**
   * Get session data
   */
  getSession(token: string): SessionData | null {
    const session = this.sessions.get(token);

    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Invalidate session
   */
  invalidateSession(token: string): void {
    this.sessions.delete(token);
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values()).filter(
      s => s.userId === userId && s.expiresAt > new Date(),
    );
  }

  /**
   * Logout all sessions for user
   */
  invalidateAllUserSessions(userId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }
}

/**
 * Multi-Factor Authentication (MFA) Service
 * Structure for future MFA implementation
 */
export enum MFAMethod {
  TOTP = 'TOTP', // Time-based One-Time Password (Google Authenticator, Authy)
  SMS = 'SMS', // SMS code
  EMAIL = 'EMAIL', // Email code
}

export interface IMFAService {
  /**
   * Generate MFA challenge
   */
  generateChallenge(userId: string, method: MFAMethod): Promise<{ challengeId: string }>;

  /**
   * Verify MFA code
   */
  verifyCode(userId: string, challengeId: string, code: string): Promise<boolean>;

  /**
   * Enable MFA for user
   */
  enableMFA(userId: string, method: MFAMethod): Promise<{ secret: string; qrCode?: string }>;

  /**
   * Disable MFA for user
   */
  disableMFA(userId: string): Promise<void>;

  /**
   * Check if user has MFA enabled
   */
  isMFAEnabled(userId: string): Promise<boolean>;
}

/**
 * Password Reset Service
 * Handles password reset flows with secure tokens
 */
export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: Date;
}

export interface IPasswordResetService {
  /**
   * Generate password reset token
   */
  generateResetToken(email: string): Promise<PasswordResetToken>;

  /**
   * Verify and consume reset token
   */
  verifyResetToken(token: string): Promise<{ email: string } | null>;

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
}

/**
 * Auth Configuration with Enhanced Options
 */
export interface EnhancedAuthConfig {
  // JWT Configuration
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;

  // Password Hashing
  saltRounds: number;

  // Security
  passwordValidationEnabled: boolean;
  rateLimitingEnabled: boolean;
  auditLoggingEnabled: boolean;
  mfaEnabled: boolean;

  // Rate Limiting
  maxLoginAttempts: number;
  loginAttemptWindowMs: number;
  loginLockoutDurationMs: number;

  // Sessions
  maxConcurrentSessions: number;
  sessionTimeoutMs: number;
}

/**
 * Auth Service Factory
 * Creates auth service with all enhancements
 */
export class AuthServiceFactory {
  static create(
    userRepository: any,
    prismaClient: any,
    config: Partial<EnhancedAuthConfig> = {},
  ) {
    const mergedConfig: EnhancedAuthConfig = {
      // Defaults
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || '',
      jwtRefreshSecret: config.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || '',
      accessTokenExpiresIn: config.accessTokenExpiresIn ?? 15 * 60,
      refreshTokenExpiresIn: config.refreshTokenExpiresIn ?? 7 * 24 * 60 * 60,
      saltRounds: config.saltRounds ?? 10,
      passwordValidationEnabled: config.passwordValidationEnabled ?? true,
      rateLimitingEnabled: config.rateLimitingEnabled ?? true,
      auditLoggingEnabled: config.auditLoggingEnabled ?? true,
      mfaEnabled: config.mfaEnabled ?? false,
      maxLoginAttempts: config.maxLoginAttempts ?? 5,
      loginAttemptWindowMs: config.loginAttemptWindowMs ?? 15 * 60 * 1000,
      loginLockoutDurationMs: config.loginLockoutDurationMs ?? 15 * 60 * 1000,
      maxConcurrentSessions: config.maxConcurrentSessions ?? 5,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 24 * 60 * 60 * 1000,
    };

    // Create service instances
    const passwordValidator = new PasswordValidator();
    const rateLimitService = new RateLimitService();
    const auditLogger = new InMemoryAuditLogger();
    const sessionManager = new SessionManager();

    return {
      config: mergedConfig,
      passwordValidator,
      rateLimitService,
      auditLogger,
      sessionManager,
    };
  }
}

export default {
  AuthErrorCode,
  AuthException,
  PasswordValidator,
  RateLimitService,
  InMemoryAuditLogger,
  SessionManager,
  AuthServiceFactory,
};
