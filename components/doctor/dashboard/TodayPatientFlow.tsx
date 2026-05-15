'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WaitingQueue } from '@/components/doctor/WaitingQueue';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="space-y-6">
      {/* Waiting Queue */}
      {waitingAppointments.length > 0 && (
        <WaitingQueue appointments={waitingAppointments} onStartConsultation={onStartConsultation} />
      )}

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today's Schedule</CardTitle>
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No sessions scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledAppointments.map((appointment) => (
                <DoctorAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStartConsultation={onStartConsultation}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
