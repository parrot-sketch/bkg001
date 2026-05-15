'use client';

import { useMemo } from 'react';
import { format, addDays, isToday, isTomorrow, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SchedulePreviewProps {
  appointments: any[];
  isLoading: boolean;
}

export function SchedulePreview({ appointments, isLoading }: SchedulePreviewProps) {
  const router = useRouter();

  // Group appointments by date
  const grouped = useMemo(() => {
    const groups: Map<string, any[]> = new Map();
    const sorted = [...appointments].sort((a, b) => {
      const dateA = new Date(a.appointmentDate);
      const dateB = new Date(b.appointmentDate);
      return dateA.getTime() - dateB.getTime();
    });

    sorted.forEach(apt => {
      const date = new Date(apt.appointmentDate);
      let key: string;
      if (isToday(date)) {
        key = 'Today';
      } else if (isTomorrow(date)) {
        key = 'Tomorrow';
      } else {
        key = format(date, 'EEE, MMM d');
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(apt);
    });

    return groups;
  }, [appointments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case AppointmentStatus.IN_CONSULTATION:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">In Consult</Badge>;
      case AppointmentStatus.CHECKED_IN:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Checked In</Badge>;
      case AppointmentStatus.READY_FOR_CONSULTATION:
        return <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 text-[10px]">Ready</Badge>;
      case AppointmentStatus.SCHEDULED:
      case AppointmentStatus.CONFIRMED:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">Scheduled</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Schedule</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Schedule</CardTitle>
            </div>
            <Link href="/doctor/schedule">
              <Button variant="ghost" size="sm" className="text-xs h-8 gap-1">
                View Calendar <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="py-10 text-center">
            <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No upcoming appointments</p>
            <Link href="/doctor/schedule" className="text-xs text-slate-400 hover:underline mt-1 inline-block">
              Manage schedule →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Upcoming Schedule</CardTitle>
          </div>
          <Link href="/doctor/schedule">
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1">
              Full Calendar <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {Array.from(grouped.entries()).map(([dateLabel, dayAppointments]) => (
            <div key={dateLabel}>
              {/* Date group header */}
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {dateLabel}
                </p>
              </div>

              {/* Appointments for this date */}
              <div className="divide-y divide-slate-50">
                {dayAppointments.map((apt) => {
                  const patientName = apt.patient
                    ? `${apt.patient.firstName} ${apt.patient.lastName}`
                    : 'Unknown';

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-center min-w-[50px]">
                          <p className="text-sm font-bold text-slate-900">{apt.time}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{apt.type?.split(' ')[0]}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {patientName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStatusBadge(apt.status)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {apt.status === AppointmentStatus.IN_CONSULTATION ? (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/doctor/consultations/session/${apt.id}`)}
                            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Resume
                          </Button>
                        ) : apt.status === AppointmentStatus.CHECKED_IN || apt.status === AppointmentStatus.READY_FOR_CONSULTATION ? (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/doctor/consultations/session/${apt.id}`)}
                            className="h-8 px-3 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            Start
                          </Button>
                        ) : (
                          <Link href={`/doctor/appointments/${apt.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                              Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
