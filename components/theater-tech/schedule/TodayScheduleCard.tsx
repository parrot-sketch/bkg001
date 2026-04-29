'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarClock } from 'lucide-react';

import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedule } from '@/hooks/theater-tech/useTheaterSchedule';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { BookingStatusBadge } from '@/components/theater-tech/schedule/BookingStatusBadge';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function TodayScheduleCard() {
  const { user, isAuthenticated } = useAuth();
  const date = todayYmd();
  const { data, isLoading, error } = useTheaterSchedule(date, { enabled: isAuthenticated && !!user });

  const bookings =
    data?.theaters
      ?.flatMap((t) => (t.bookings || []).map((b) => ({ ...b, theaterName: t.name })))
      .filter((b) => (b.status || '').toUpperCase() !== 'CANCELLED')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5) ?? [];

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-[0.18em]">Today</span>
          </div>
          <CardTitle className="text-base">Theater Schedule</CardTitle>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/theater-tech/theater-schedule">Open</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="text-sm text-slate-500">{error.message}</div>
        ) : bookings.length === 0 ? (
          <div className="text-sm text-slate-500">No bookings today.</div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {format(new Date(b.startTime), 'HH:mm')} · {b.patientName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {b.theaterName} · {b.procedure}
                  </div>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

