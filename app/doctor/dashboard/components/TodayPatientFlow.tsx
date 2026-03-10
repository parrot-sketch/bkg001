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
      <section className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Confirmed Sessions</p>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Today's Patient Flow</h2>
            </div>
          </div>
          <Link href="/doctor/appointments">
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-medium gap-1">
              Full Calendar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="p-6">
          {isLoading ? (
            <ScheduleSkeleton />
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                 <Calendar className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Workspace Clear</h3>
              <p className="text-sm text-muted-foreground mt-1">No sessions scheduled for today yet.</p>
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
