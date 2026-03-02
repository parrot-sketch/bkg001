import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit } from '@/lib/security/rateLimit';

describe('Rate Limiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('should allow requests within limit', () => {
        const options = { windowMs: 1000, max: 2, keyPrefix: 'test' };

        const res1 = rateLimit('user1', options);
        expect(res1.success).toBe(true);
        expect(res1.remaining).toBe(1);

        const res2 = rateLimit('user1', options);
        expect(res2.success).toBe(true);
        expect(res2.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
        const options = { windowMs: 1000, max: 1, keyPrefix: 'test-block' };

        rateLimit('user2', options);
        const res = rateLimit('user2', options);

        expect(res.success).toBe(false);
        expect(res.remaining).toBe(0);
    });

    it('should reset limit after window expires', () => {
        const options = { windowMs: 1000, max: 1, keyPrefix: 'test-reset' };

        rateLimit('user3', options);
        const res1 = rateLimit('user3', options);
        expect(res1.success).toBe(false);

        // Advance time by 1.1 seconds
        vi.advanceTimersByTime(1100);

        const res2 = rateLimit('user3', options);
        expect(res2.success).toBe(true);
        expect(res2.remaining).toBe(0);
    });

    it('should isolate different identifiers', () => {
        const options = { windowMs: 1000, max: 1, keyPrefix: 'test-iso' };

        rateLimit('userA', options);
        const resB = rateLimit('userB', options);

        expect(resB.success).toBe(true);
    });
});
