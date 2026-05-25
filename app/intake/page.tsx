'use client';

/**
 * /intake — Permanent QR entrypoint
 *
 * This page is intentionally stable and non-expiring so a single QR can be
 * printed and placed at the front desk.
 *
 * On open, it creates a fresh time-limited intake session and redirects to
 * `/intake/[sessionId]`.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';

export default function IntakeEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch('/api/patient/intake/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to start intake session');
        }
        if (cancelled) return;
        const sessionId = data?.sessionId as string | undefined;
        if (!sessionId) throw new Error('Missing sessionId from server');
        router.replace(`/intake/${encodeURIComponent(sessionId)}`);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to start intake session');
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-6 pt-10 pb-6 text-center border-b border-slate-100">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">NS</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">Nairobi Sculpt</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Could not start intake</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">{error}</p>
          <p className="text-xs text-slate-400">
            Please tell the receptionist to check the connection and try again.
          </p>
        </div>

        <div className="px-6 pb-8 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Shield className="h-3 w-3" />
            <span>Your information is encrypted and stored securely.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
          <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600">Starting your secure intake session…</p>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          Private & secure
        </p>
      </div>
    </div>
  );
}

