/**
 * Browser fetch that attaches the doctor JWT from localStorage.
 * Prefer this over bare fetch for doctor API routes when cookies may be stale.
 */

import { tokenStorage } from '@/lib/auth/token';

export async function authenticatedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenStorage.getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
}
