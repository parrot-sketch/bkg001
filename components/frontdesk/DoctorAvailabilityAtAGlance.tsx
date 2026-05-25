'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v));
  return (h || 0) * 60 + (m || 0);
}

type AvailabilityNowStatus = 'AVAILABLE' | 'LATER_TODAY' | 'OFF';

function getNowStatus(doctor: DoctorAvailabilityResponseDto, now: Date): AvailabilityNowStatus {
  const dayName = format(now, 'EEEE').toLowerCase();
  const wd = doctor.workingDays?.find((d) => (d.day || '').toLowerCase() === dayName);
  if (!wd?.isAvailable) return 'OFF';

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sessions =
    wd.sessions?.length && wd.sessions.length > 0
      ? wd.sessions
      : [{ startTime: wd.startTime, endTime: wd.endTime }];

  const inSession = sessions.some((s) => nowMins >= timeToMinutes(s.startTime) && nowMins < timeToMinutes(s.endTime));
  if (inSession) return 'AVAILABLE';

  const later = sessions.some((s) => nowMins < timeToMinutes(s.startTime));
  return later ? 'LATER_TODAY' : 'OFF';
}

function getTodayHoursLabel(doctor: DoctorAvailabilityResponseDto, now: Date): string {
  const dayName = format(now, 'EEEE').toLowerCase();
  const wd = doctor.workingDays?.find((d) => (d.day || '').toLowerCase() === dayName);
  if (!wd?.isAvailable) return 'Off';
  const sessions =
    wd.sessions?.length && wd.sessions.length > 0
      ? wd.sessions
      : [{ startTime: wd.startTime, endTime: wd.endTime }];
  return sessions.map((s) => `${s.startTime}–${s.endTime}`).join(', ');
}

function StatusBadge({ status }: { status: AvailabilityNowStatus }) {
  if (status === 'AVAILABLE') {
    return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Available</Badge>;
  }
  if (status === 'LATER_TODAY') {
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Later today</Badge>;
  }
  return <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">Off</Badge>;
}

export function DoctorAvailabilityAtAGlance() {
  const { openBookingDialog } = useBookAppointmentStore();
  const today = useMemo(() => new Date(), []);
  const { data: doctors = [], isLoading, error } = useDoctorsAvailability(today, today);

  const rows = useMemo(() => {
    const now = new Date();
    return doctors
      .map((d) => ({
        doctor: d,
        status: getNowStatus(d, now),
        hours: getTodayHoursLabel(d, now),
      }))
      .sort((a, b) => {
        const order: Record<AvailabilityNowStatus, number> = { AVAILABLE: 0, LATER_TODAY: 1, OFF: 2 };
        return order[a.status] - order[b.status] || a.doctor.doctorName.localeCompare(b.doctor.doctorName);
      });
  }, [doctors]);

  return (
    <section className="border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Doctor availability</div>
        <div className="text-xs text-slate-500">{format(new Date(), 'EEE, MMM d')}</div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : error ? (
          <div className="text-sm text-slate-600">Unable to load availability.</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">No doctors found.</div>
        ) : (
          <div className="space-y-2">
            {rows.map(({ doctor, status, hours }) => (
              <div key={doctor.doctorId} className="flex items-center justify-between gap-3 border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{doctor.doctorName}</div>
                  <div className="text-xs text-slate-500 truncate">{hours}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={status} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none"
                    onClick={() =>
                      openBookingDialog({
                        initialDoctorId: doctor.doctorId,
                        lockDoctor: true,
                        source: AppointmentSource.FRONTDESK_SCHEDULED,
                        bookingChannel: BookingChannel.DASHBOARD,
                      })
                    }
                  >
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

