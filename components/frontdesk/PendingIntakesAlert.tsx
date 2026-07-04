'use client';

/**
 * PendingIntakesAlert
 *
 * Self-contained container — owns its own data hook.
 * Renders nothing (null) if there are no pending intakes or if data fails — never crashes the layout.
 * 
 * Branded with Nairobi Sculpt light palette: beige borders, navy typography, gold accents.
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
      <Card className="border-l-4 border-l-[#caa26a] bg-[#e7d6bf]/15 shadow-sm rounded-none cursor-pointer hover:bg-[#e7d6bf]/25 transition-colors hidden sm:block">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-bold text-[#2c2e4b]">Pending intakes</p>
          <p className="text-[10px] sm:text-xs text-[#caa26a] mt-0.5 font-medium">
            {stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
