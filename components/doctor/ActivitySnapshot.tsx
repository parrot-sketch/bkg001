'use client';

/**
 * Activity Snapshot Component
 * 
 * Quick view of today's work and upcoming tasks.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface ActivitySnapshotProps {
  todayAppointments: AppointmentResponseDto[];
  upcomingAppointments: AppointmentResponseDto[];
  loading?: boolean;
}

export function ActivitySnapshot({
  todayAppointments = [],
  upcomingAppointments = [],
  loading = false,
}: ActivitySnapshotProps) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Filter today's appointments
  const todays = todayAppointments.filter((apt) => {
    const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
    return aptDate === todayStr;
  });

  // Get upcoming (next 7 days, excluding today)
  const upcoming = upcomingAppointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    const aptDateStr = format(aptDate, 'yyyy-MM-dd');
    return aptDateStr > todayStr && aptDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Snapshot</CardTitle>
        <CardDescription>Today's appointments and upcoming schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Today's Appointments
              </h3>
              <span className="text-xs text-muted-foreground">{todays.length}</span>
            </div>
            {todays.length > 0 ? (
              <div className="space-y-2">
                {todays.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{`Patient ${apt.patientId}`}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          apt.status === 'SCHEDULED'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : apt.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
                {todays.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{todays.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed text-center">
                <p className="text-sm text-muted-foreground">No appointments today</p>
              </div>
            )}
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm" className="w-full">
                View All Appointments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Upcoming Appointments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming (Next 7 Days)
              </h3>
              <span className="text-xs text-muted-foreground">{upcoming.length}</span>
            </div>
            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{`Patient ${apt.patientId}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(apt.appointmentDate), 'MMM d, yyyy')} at {apt.time}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
                {upcoming.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{upcoming.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed text-center">
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              </div>
            )}
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm" className="w-full">
                View All Appointments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
