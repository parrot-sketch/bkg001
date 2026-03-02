/**
 * Utility: Simple in-memory rate limiter for API endpoints.
 * 
 * Used for sensitive endpoints like file uploads.
 */

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const cache = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyPrefix?: string;
}

export function rateLimit(identifier: string, options: RateLimitOptions): { success: boolean; remaining: number; reset: number } {
    const key = `${options.keyPrefix || 'rl'}:${identifier}`;
    const now = Date.now();

    let record = cache.get(key);

    if (!record || now > record.resetTime) {
        record = {
            count: 0,
            resetTime: now + options.windowMs,
        };
    }

    record.count++;
    cache.set(key, record);

    const success = record.count <= options.max;
    const remaining = Math.max(0, options.max - record.count);

    return {
        success,
        remaining,
        reset: record.resetTime,
    };
}

/**
 * Cleanup expired records periodically
 */
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of cache.entries()) {
            if (now > record.resetTime) {
                cache.delete(key);
            }
        }
    }, 60000); // Every minute
}
