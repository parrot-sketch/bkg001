'use client';

/**
 * PendingIntakesAlert
 *
 * Self-contained container — owns its own data hook.
 * Renders nothing (null) if there are no pending intakes or if data fails — never crashes the layout.
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';

export function PendingIntakesAlert() {
  const { data: stats, isLoading, error } = useDashboardStats();

  // Do not render anything on error or loading — this is a supplemental UI element
  if (isLoading || error || !stats || stats.pendingIntakeCount <= 0) return null;

  return (
    <Link href="/frontdesk/intake/pending">
      <Card className="border-slate-200 bg-white shadow-none rounded-none cursor-pointer hover:bg-slate-50 transition-colors hidden sm:block">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-semibold text-slate-900">Pending intakes</p>
          <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
            {stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
