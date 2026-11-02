'use client';

/**
 * When a server layout cannot read the httpOnly accessToken cookie
 * (expired / desynced), refresh once via the refresh cookie and resume the page.
 */

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/auth/token';

export function ServerAuthResume({ nextPath }: { nextPath: string }) {
  const [message, setMessage] = useState('Restoring your session…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await authApi.refreshToken();
        if (!response.success) {
          tokenStorage.clear();
          window.location.replace('/login');
          return;
        }

        if (!cancelled) {
          window.location.replace(nextPath);
        }
      } catch {
        if (!cancelled) {
          setMessage('Session expired. Redirecting to login…');
          tokenStorage.clear();
          window.location.replace('/login');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-2xl border border-[#e7d6bf] bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-[#2c2e4b]">{message}</p>
      </div>
    </div>
  );
}
