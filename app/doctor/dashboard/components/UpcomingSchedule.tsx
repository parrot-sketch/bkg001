'use client';

import { Clock } from 'lucide-react';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';

interface UpcomingScheduleProps {
  appointments: any[];
  isLoading: boolean;
}

export function UpcomingSchedule({ appointments, isLoading }: UpcomingScheduleProps) {
  return (
    <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
        <Clock className="h-4 w-4 text-slate-700" />
        <h2 className="text-sm font-semibold text-slate-800">Upcoming Schedule</h2>
      </div>
      <div className="p-4">
        {isLoading ? (
          <ScheduleSkeleton count={2} />
        ) : appointments.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400 font-medium">
            No sessions scheduled for the next 48 hours.
          </p>
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
