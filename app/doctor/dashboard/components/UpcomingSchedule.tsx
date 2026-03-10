'use client';

import { Clock } from 'lucide-react';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';

interface UpcomingScheduleProps {
  appointments: any[];
  isLoading: boolean;
}

export function UpcomingSchedule({ appointments, isLoading }: UpcomingScheduleProps) {
  return (
    <section className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Clock className="h-5 w-5 text-orange-600" />
        </div>
        <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Next 48 Hours</p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Upcoming Schedule</h2>
        </div>
      </div>
      <div className="p-6">
        {isLoading ? (
          <ScheduleSkeleton count={2} />
        ) : appointments.length === 0 ? (
          <div className="text-center py-8">
             <p className="text-sm text-muted-foreground">
               No upcoming sessions scheduled.
             </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 3).map((appointment) => (
              <DoctorAppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 w-full bg-slate-50 animate-pulse rounded-xl border border-slate-100" />
      ))}
    </div>
  );
}
