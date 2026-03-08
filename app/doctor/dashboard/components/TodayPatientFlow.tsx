'use client';

import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WaitingQueue } from '@/components/doctor/WaitingQueue';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';

interface TodayPatientFlowProps {
  appointments: any[];
  isLoading: boolean;
  onStartConsultation: (appointment: any) => void;
}

export function TodayPatientFlow({ appointments, isLoading, onStartConsultation }: TodayPatientFlowProps) {
  const waitingAppointments = appointments.filter(
    (a) => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION'
  );
  
  const scheduledAppointments = appointments.filter(
    (a) => a.status !== 'CHECKED_IN' && a.status !== 'READY_FOR_CONSULTATION'
  );

  return (
    <div className="space-y-8">
      {/* Waiting Queue */}
      {waitingAppointments.length > 0 && (
        <WaitingQueue
          appointments={waitingAppointments}
          onStartConsultation={onStartConsultation}
        />
      )}

      {/* Main Flow */}
      <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Today's Patient Flow</h2>
          </div>
          <Link href="/doctor/appointments">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900 font-medium gap-1">
              Full Calendar
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="p-4">
          {isLoading ? (
            <ScheduleSkeleton />
          ) : appointments.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/30 rounded-lg border border-dashed border-slate-200">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Workspace Clear</h3>
              <p className="text-xs text-slate-500">No sessions scheduled for today yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledAppointments.map((appointment) => (
                <DoctorAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStartConsultation={onStartConsultation}
                />
              ))}

              {scheduledAppointments.length === 0 && appointments.length > 0 && (
                <p className="text-center text-slate-500 py-4 text-sm">
                  All active patients are in the waiting queue.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
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
