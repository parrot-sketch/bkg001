'use client';

/**
 * Weekly Availability Grid Component
 * 
 * Visual overview of doctor's weekly schedule showing available vs booked slots.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import Link from 'next/link';

interface WeeklyAvailabilityGridProps {
  availability: DoctorAvailabilityResponseDto | null;
  appointments: AppointmentResponseDto[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyAvailabilityGrid({
  availability,
  appointments,
}: WeeklyAvailabilityGridProps) {
  // Get appointments for each day of the week (next 7 days)
  const getAppointmentsForDay = (dayName: string) => {
    const today = new Date();
    const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
    if (dayIndex === -1) return [];

    // Find the next occurrence of this day
    const daysUntil = (dayIndex - today.getDay() + 7) % 7 || 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    return appointments.filter((apt) => {
      const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      return aptDate === dateStr;
    });
  };

  // Get working day info
  const getWorkingDayInfo = (dayName: string) => {
    if (!availability?.workingDays) return null;
    return availability.workingDays.find((wd) => {
      const wdDay = (wd as any).day || (wd as any).day_of_week;
      return wdDay?.toLowerCase() === dayName.toLowerCase();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Schedule Overview</CardTitle>
            <CardDescription>Weekly availability and booked appointments</CardDescription>
          </div>
          <Link href="/doctor/schedule">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((dayName, index) => {
            const workingDay = getWorkingDayInfo(dayName);
            const dayAppointments = getAppointmentsForDay(dayName);
            const isAvailable = workingDay?.isAvailable ?? false;

            return (
              <div
                key={dayName}
                className={`p-3 rounded-lg border-2 ${isAvailable
                  ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800'
                  : 'border-gray-200 bg-gray-50 dark:bg-gray-900/50 dark:border-gray-800'
                  }`}
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {DAY_ABBREVIATIONS[index]}
                  </p>
                  {isAvailable && workingDay ? (
                    <>
                      <div className="flex items-center justify-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          {(workingDay as any).startTime || (workingDay as any).start_time} - {(workingDay as any).endTime || (workingDay as any).end_time}
                        </span>
                      </div>
                      <div className="pt-1">
                        <p className="text-lg font-bold text-foreground">{dayAppointments.length}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayAppointments.length === 1 ? 'appointment' : 'appointments'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not Available</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800"></div>
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-800"></div>
              <span className="text-muted-foreground">Unavailable</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Total: {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
