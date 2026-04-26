'use client';

/**
 * PendingIntakesAlert
 *
 * Self-contained container — owns its own data hook.
 * Renders nothing (null) if there are no pending intakes or if data fails — never crashes the layout.
 */

import Link from 'next/link';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';

export function PendingIntakesAlert() {
  const { data: stats, isLoading, error } = useDashboardStats();

  // Do not render anything on error or loading — this is a supplemental UI element
  if (isLoading || error || !stats || stats.pendingIntakeCount <= 0) return null;

  return (
    <Link href="/frontdesk/intake/pending">
      <Card className="border-slate-200 bg-slate-50 shadow-sm rounded-lg sm:rounded-xl cursor-pointer hover:shadow-md transition-shadow hidden sm:block">
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-200 shrink-0">
            <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-800">Pending Intakes</p>
            <p className="text-[10px] sm:text-xs text-slate-600 truncate">
              {stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
