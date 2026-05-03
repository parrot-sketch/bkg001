/**
 * DbRateLimiter
 *
 * Database-backed rate limiter using the existing `LoginAttempt` table.
 * Works correctly across all concurrent Lambda instances and survives cold
 * starts — unlike the previous InMemoryRateLimiter which reset state every
 * time a new Lambda was spun up (P0-1 audit finding).
 *
 * Design:
 *  - IP rate limiting:    COUNT(*) from LoginAttempt WHERE ip_address = ? AND attempt_at >= window_start
 *  - Email rate limiting: Handled by User.failed_login_attempts + User.locked_until (already atomic)
 *  - Attempt recording:   INSERT into LoginAttempt on every login attempt (success or failure)
 *
 * Performance:
 *  - Both COUNT queries hit the composite indexes (ip_address, attempt_at) and
 *    (email, attempt_at) added in the latest schema migration.
 *  - Each check is a single indexed COUNT — ~5–15 ms on Aiven, well within budget.
 *  - Table growth is bounded by the cleanup job (see cleanupOldAttempts).
 */

import { PrismaClient } from '@prisma/client';

export interface RateLimitResult {
  isLimited: boolean;
  attemptCount: number;
  retryAfterSeconds?: number;
}

export interface DbRateLimiterConfig {
  /** Max login attempts allowed within the window */
  maxAttempts: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_IP_CONFIG: DbRateLimiterConfig = {
  maxAttempts: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export class DbRateLimiter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: DbRateLimiterConfig = DEFAULT_IP_CONFIG,
  ) {}

  /**
   * Check whether the given IP address has exceeded the rate limit.
   *
   * Uses a COUNT(*) over the LoginAttempt table within the sliding window.
   * The composite index (ip_address, attempt_at) makes this an efficient
   * indexed range scan rather than a full table scan.
   *
   * @param ip - Client IP address (from x-forwarded-for)
   */
  async isIpRateLimited(ip: string): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - this.config.windowMs);

    const count = await this.prisma.loginAttempt.count({
      where: {
        ip_address: ip,
        attempt_at: { gte: windowStart },
      },
    });

    const isLimited = count >= this.config.maxAttempts;
    const retryAfterSeconds = isLimited
      ? Math.ceil(this.config.windowMs / 1000)
      : undefined;

    return { isLimited, attemptCount: count, retryAfterSeconds };
  }

  /**
   * Record a login attempt (success or failure).
   *
   * This single INSERT serves dual purpose:
   *  1. Audit trail — every attempt is recorded with ip, email, user_agent
   *  2. Rate limit input — the COUNT in isIpRateLimited reads from this table
   *
   * Fire-and-forget: caller should NOT await this in the critical path.
   * Use .catch() to swallow errors so a logging failure never blocks login.
   *
   * @param ip        - Client IP address
   * @param email     - Email address used in the attempt
   * @param success   - Whether the attempt succeeded
   * @param userAgent - User-Agent header (optional)
   * @param userId    - Resolved user ID if available (optional)
   * @param reason    - Failure reason if applicable (optional)
   */
  async recordAttempt(params: {
    ip: string;
    email: string;
    success: boolean;
    userAgent?: string;
    userId?: string;
    reason?: string;
  }): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        ip_address: params.ip,
        email:      params.email.toLowerCase(),
        success:    params.success,
        user_agent: params.userAgent,
        user_id:    params.userId,
        reason:     params.reason,
        // attempt_at defaults to now() in the schema
      },
    });
  }

  /**
   * Purge LoginAttempt rows older than the retention window.
   *
   * Call this from a scheduled job (Vercel Cron or on 1% of requests)
   * to keep the table from growing unboundedly.
   *
   * Default retention: 24 hours (much longer than the 15-min rate-limit
   * window, so audit data is available for investigation).
   *
   * @param retentionMs - How far back to keep records (default: 24h)
   */
  async cleanupOldAttempts(retentionMs = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - retentionMs);
    const result = await this.prisma.loginAttempt.deleteMany({
      where: { attempt_at: { lt: cutoff } },
    });
    return result.count;
  }
}

/**
 * Singleton instance — reused across all requests on the same Lambda instance.
 * Import this directly rather than creating a new DbRateLimiter per request.
 */
let _instance: DbRateLimiter | null = null;

export function getDbRateLimiter(prisma: PrismaClient): DbRateLimiter {
  if (!_instance) {
    _instance = new DbRateLimiter(prisma, DEFAULT_IP_CONFIG);
  }
  return _instance;
}
