import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiClient } from '@/lib/api/client';

describe('apiClient (status propagation)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes http status + Retry-After on structured API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: 'Too many requests' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '900',
            },
          },
        ),
      ),
    );

    const res = await apiClient.post('/authentication/login', {
      email: 'user@example.com',
      password: 'wrong',
    });

    expect(res.success).toBe(false);
    expect((res as any).status).toBe(429);
    expect((res as any).retryAfterSeconds).toBe(900);
    expect((res as any).error).toBe('Too many requests');
  });
});

