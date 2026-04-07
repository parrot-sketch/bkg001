export interface RateLimitResult {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterMs?: number;
}

/**
 * Interface defining the Rate Limiter contract
 * Adheres to Clean Architecture principles by allowing interchangeable backends
 * (e.g., Redis for production, Memory for development)
 */
export interface IRateLimiter {
  /**
   * Checks if the given key is currently rate-limited.
   * Does NOT increment the attempt counter.
   */
  isRateLimited(key: string): Promise<RateLimitResult>;

  /**
   * Records a new attempt for the key.
   */
  recordAttempt(key: string): Promise<void>;

  /**
   * Returns the remaining number of attempts for the given key in the current window.
   */
  getRemainingAttempts(key: string): Promise<number>;

  /**
   * Clears rate limit state for a key (useful for tests or admin unlocks)
   */
  clear(key: string): Promise<void>;
}
