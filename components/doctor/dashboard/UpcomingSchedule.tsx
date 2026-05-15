'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
import { Skeleton } from '@/components/ui/skeleton';

interface UpcomingScheduleProps {
  appointments: any[];
  isLoading: boolean;
}

export function UpcomingSchedule({ appointments, isLoading }: UpcomingScheduleProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Upcoming</CardTitle>
        <p className="text-xs text-slate-500">Next 48 hours</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <DoctorAppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
