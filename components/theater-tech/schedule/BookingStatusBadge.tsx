'use client';

import { Badge } from '@/components/ui/badge';

export function BookingStatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();

  if (s === 'CONFIRMED' || s === 'SCHEDULED') {
    return (
      <Badge className="text-[11px] bg-slate-100 text-slate-700 border border-slate-300">
        Confirmed
      </Badge>
    );
  }

  if (s === 'PROVISIONAL') {
    return (
      <Badge className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
        Locked
      </Badge>
    );
  }

  if (s === 'CANCELLED') {
    return (
      <Badge className="text-[11px] bg-red-50 text-red-700 border border-red-200">
        Cancelled
      </Badge>
    );
  }

  if (s === 'COMPLETED') {
    return (
      <Badge className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
        Completed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[11px]">
      {status || 'Unknown'}
    </Badge>
  );
}

