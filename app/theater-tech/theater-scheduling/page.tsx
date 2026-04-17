'use client';

/**
 * Theater Tech Theater Scheduling Page
 *
 * Queue of cases in READY_FOR_THEATER_BOOKING with a direct booking modal.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedulingQueue } from '@/hooks/theater-tech/useTheaterSchedulingQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TheaterBookingModal } from '@/components/theater-tech/booking/TheaterBookingModal';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Search,
  Scissors,
} from 'lucide-react';
import { formatDoctorName } from '@/lib/formatting/formatDoctorName';

type QueueCase = NonNullable<ReturnType<typeof useTheaterSchedulingQueue>['data']>['cases'][number];

export default function TheaterTechTheaterSchedulingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = useTheaterSchedulingQueue({ enabled: isAuthenticated && !!user });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<QueueCase | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const filtered = useMemo(() => {
    const cases = data?.cases ?? [];
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => {
      const patient = c.patient?.name?.toLowerCase() || '';
      const file = c.patient?.fileNumber?.toLowerCase() || '';
      const proc = c.procedure?.toLowerCase() || '';
      const surgeon = c.surgeon?.name?.toLowerCase() || '';
      return patient.includes(q) || file.includes(q) || proc.includes(q) || surgeon.includes(q);
    });
  }, [data?.cases, searchQuery]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading theater scheduling…</p>
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
            <p className="text-sm text-slate-500">Please log in to access theater scheduling.</p>
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
            <span className="text-xs font-medium uppercase tracking-[0.18em]">Theater Scheduling</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ready for Booking</h1>
          <p className="text-sm text-slate-500">
            Cases here have cleared ward prep and are ready to be booked into an available theater slot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/theater-tech/surgical-cases">Surgical Cases</Link>
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
              <CardTitle className="text-base">Scheduling Queue</CardTitle>
              <p className="text-xs text-slate-500">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
            </div>
            <div className="relative w-full sm:w-[340px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient, file no, procedure, surgeon…"
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <p className="font-medium text-slate-900">Failed to load scheduling queue</p>
              <p className="text-sm text-slate-500 mt-1">{error.message}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-medium text-slate-900">No cases ready for booking</p>
              <p className="text-sm text-slate-500 mt-1">
                When the nurse finalizes ward prep, cases will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{c.patient?.name ?? 'Unknown patient'}</p>
                      {c.patient?.fileNumber && (
                        <span className="text-xs text-slate-400 font-mono">{c.patient.fileNumber}</span>
                      )}
                      <Badge variant="outline" className="text-[11px]">
                        {c.urgency}
                      </Badge>
                      {c.preOpChecklistFinalized && (
                        <Badge className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ward Prep Complete
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                      <Scissors className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{c.procedure}</span>
                      {c.surgeon?.name && (
                        <span className="text-slate-400">·</span>
                      )}
                      {c.surgeon?.name && (
                        <span className="truncate">{formatDoctorName(c.surgeon.name)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCase(c);
                        setIsBookingOpen(true);
                      }}
                    >
                      Book Theater
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/theater-tech/surgical-cases/${c.id}`}>Open Case</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCase && (
        <TheaterBookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          caseId={selectedCase.id}
          caseDurationMinutes={60}
          patientName={selectedCase.patient?.name ?? 'Patient'}
          procedureName={selectedCase.procedure}
          onBookingConfirmed={() => setIsBookingOpen(false)}
        />
      )}
    </div>
  );
}
