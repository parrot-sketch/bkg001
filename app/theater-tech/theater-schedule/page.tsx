'use client';

/**
 * Theater Tech: Theater Schedule
 *
 * Readable schedule view (by date) with small, precise actions:
 * - Reschedule booking
 * - Cancel booking
 *
 * Source of truth: GET /api/theater-tech/theater-scheduling/theaters?date=YYYY-MM-DD
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarClock, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedule } from '@/hooks/theater-tech/useTheaterSchedule';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { BookingStatusBadge } from '@/components/theater-tech/schedule/BookingStatusBadge';
import { CancelBookingDialog } from '@/components/theater-tech/schedule/CancelBookingDialog';
import { RescheduleBookingDialog } from '@/components/theater-tech/schedule/RescheduleBookingDialog';

function ymd(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function TheaterTechTheaterSchedulePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [date, setDate] = useState(() => ymd(new Date()));

  const { data, isLoading, error } = useTheaterSchedule(date, { enabled: isAuthenticated && !!user });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelTitle, setCancelTitle] = useState('');
  const [cancelSubtitle, setCancelSubtitle] = useState<string | undefined>(undefined);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<null | {
    bookingId: string;
    caseId: string;
    patientName: string;
    procedure: string;
    startTime: string;
    endTime: string;
  }>(null);

  const theaters = useMemo(() => {
    const t = data?.theaters ?? [];
    return t.map((x) => ({
      ...x,
      bookings: (x.bookings || []).slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    }));
  }, [data?.theaters]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading schedule…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Card className="max-w-md w-full border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">Please log in to access the theater schedule.</p>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-[0.18em]">Theater Schedule</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-500">
            Confirmed bookings and active slot locks for the selected date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/theater-tech/theater-scheduling">Scheduling Queue</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/theater-tech/dayboard">Dayboard</Link>
          </Button>
        </div>
      </header>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Date</CardTitle>
              <p className="text-xs text-slate-500">{format(new Date(date), 'EEEE, dd MMM yyyy')}</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setDate(ymd(addDays(new Date(date), -1)))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-[170px] bg-white"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setDate(ymd(addDays(new Date(date), 1)))}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setDate(ymd(new Date()))}>
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4">
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-900">Failed to load schedule</p>
              <p className="text-sm text-slate-500 mt-1">{error.message}</p>
            </div>
          ) : theaters.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-slate-900">No active theaters found</p>
              <p className="text-sm text-slate-500 mt-1">Ask an admin to configure theaters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {theaters.map((theater) => (
                <div key={theater.id} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{theater.name}</div>
                      <div className="text-xs text-slate-500">
                        {theater.type} · KES {Number(theater.hourlyRate || 0).toLocaleString()}/hr
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {theater.bookings.length} booking{theater.bookings.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  {theater.bookings.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-4">
                      No bookings for this date.
                    </div>
                  ) : (
                    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Time</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead className="hidden md:table-cell">Procedure</TableHead>
                            <TableHead className="w-[110px]">Status</TableHead>
                            <TableHead className="w-[200px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {theater.bookings.map((b) => {
                            const start = new Date(b.startTime);
                            const end = new Date(b.endTime);
                            const canReschedule = (b.status || '').toUpperCase() === 'CONFIRMED';
                            const canCancel = (b.status || '').toUpperCase() !== 'CANCELLED' && (b.status || '').toUpperCase() !== 'COMPLETED';
                            return (
                              <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs text-slate-700">
                                  {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="font-medium text-slate-900 truncate">{b.patientName}</div>
                                  <div className="text-xs text-slate-500 md:hidden truncate">{b.procedure}</div>
                                  <div className="text-xs text-slate-400 font-mono">{b.caseNumber}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-slate-700">
                                  {b.procedure}
                                </TableCell>
                                <TableCell>
                                  <BookingStatusBadge status={b.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canReschedule}
                                      onClick={() => {
                                        if (!canReschedule) {
                                          toast.error('Only confirmed bookings can be rescheduled.');
                                          return;
                                        }
                                        setRescheduleBooking({
                                          bookingId: b.id,
                                          caseId: b.caseId,
                                          patientName: b.patientName,
                                          procedure: b.procedure,
                                          startTime: b.startTime,
                                          endTime: b.endTime,
                                        });
                                        setRescheduleOpen(true);
                                      }}
                                    >
                                      Reschedule
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canCancel}
                                      onClick={() => {
                                        if (!canCancel) return;
                                        setCancelBookingId(b.id);
                                        setCancelTitle(`${b.patientName} — ${b.procedure}`);
                                        setCancelSubtitle(`${theater.name} · ${format(start, 'MMM d, yyyy HH:mm')}–${format(end, 'HH:mm')}`);
                                        setCancelOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={cancelBookingId}
        title={cancelTitle}
        subtitle={cancelSubtitle}
      />

      <RescheduleBookingDialog
        open={rescheduleOpen}
        onOpenChange={(open) => {
          setRescheduleOpen(open);
          if (!open) setRescheduleBooking(null);
        }}
        booking={rescheduleBooking}
      />
    </div>
  );
}

