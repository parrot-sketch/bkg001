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

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { IntakeLoadingScreen, IntakeStatusScreen } from '@/components/patient/intake-form/ui/IntakeShell';

export default function IntakeEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Guards against React strict-mode double effects creating two sessions per scan.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function start() {
      try {
        const res = await fetch('/api/patient/intake/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Could not start the form. Please try again.');
        }
        const sessionId = data?.sessionId as string | undefined;
        if (!sessionId) throw new Error('Could not start the form. Please try again.');
        router.replace(`/intake/${encodeURIComponent(sessionId)}`);
      } catch (e) {
        setError(
          e instanceof TypeError
            ? 'No connection. Check your internet and try again.'
            : e instanceof Error ? e.message : 'Could not start the form. Please try again.',
        );
      }
    }

    start();
  }, [router]);

  if (error) {
    return (
      <IntakeStatusScreen
        icon={<WifiOff className="h-8 w-8" />}
        tone="error"
        title="We couldn't open the form"
        message={error}
        action={{ href: '/intake', label: 'Try again' }}
        footnote="If this keeps happening, please ask the front desk for help."
      />
    );
  }

  return <IntakeLoadingScreen message="Preparing your registration form…" />;
}
