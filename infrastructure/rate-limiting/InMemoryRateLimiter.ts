import { IRateLimiter, RateLimitResult } from '../../domain/interfaces/services/IRateLimiter';

interface WindowState {
  timestamps: number[];
}

export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
}

/**
 * In-Memory strict sliding window algorithm
 * Suitable for single-instance or local deployment environments.
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private readonly store: Map<string, WindowState> = new Map();
  private readonly config: RateLimiterConfig;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      maxRequests: config?.maxRequests ?? 10,
      windowMs: config?.windowMs ?? 15 * 60 * 1000, // Default 15 minutes
    };

    // Prevent memory leaks via a scheduled GC sweep if running actively
    // Checks every 5 minutes
    setInterval(() => this.garbageCollect(), 5 * 60 * 1000).unref();
  }

  private filterValidTimestamps(timestamps: number[]): number[] {
    const cutoff = Date.now() - this.config.windowMs;
    return timestamps.filter((time) => time >= cutoff);
  }

  async isRateLimited(key: string): Promise<RateLimitResult> {
    const state = this.store.get(key);
    if (!state) {
      return { isLimited: false, remainingAttempts: this.config.maxRequests };
    }

    const validTimestamps = this.filterValidTimestamps(state.timestamps);
    
    // Update map to free up memory from old timestamps
    this.store.set(key, { timestamps: validTimestamps });

    const isLimited = validTimestamps.length >= this.config.maxRequests;
    const remainingAttempts = Math.max(0, this.config.maxRequests - validTimestamps.length);
    
    let retryAfterMs: number | undefined;
    if (isLimited && validTimestamps.length > 0) {
      // Find the oldest active stamp. They get unblocked once this stamp expires.
      const oldestStamp = validTimestamps[0];
      retryAfterMs = this.config.windowMs - (Date.now() - oldestStamp);
    }

    return {
      isLimited,
      remainingAttempts,
      retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined,
    };
  }

  async recordAttempt(key: string): Promise<void> {
    const state = this.store.get(key) || { timestamps: [] };
    
    // Auto-clean before appending to save memory
    const validTimestamps = this.filterValidTimestamps(state.timestamps);
    validTimestamps.push(Date.now());
    
    this.store.set(key, { timestamps: validTimestamps });
  }

  async getRemainingAttempts(key: string): Promise<number> {
    const { remainingAttempts } = await this.isRateLimited(key);
    return remainingAttempts;
  }

  async clear(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Internal Garbage Collection loop to nuke stale IPs that no longer need tracking
   */
  private garbageCollect() {
    const cutoff = Date.now() - this.config.windowMs;
    for (const [key, state] of this.store.entries()) {
      const isStale = state.timestamps.every(t => t < cutoff);
      if (isStale) {
        this.store.delete(key);
      }
    }
  }
}
