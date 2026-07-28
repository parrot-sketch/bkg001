/**
 * Fetch Mock
 *
 * Replaces globalThis.fetch with a Vitest mock.
 */

import { vi } from 'vitest';

export function mockFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}
