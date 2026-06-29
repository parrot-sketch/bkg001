'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import type { DoctorDashboardData } from '@/hooks/use-doctor-dashboard';

type TodayAppointment = DoctorDashboardData['todayAppointments'][number];

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING_DOCTOR_CONFIRMATION: { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
  SCHEDULED: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
  CONFIRMED: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
  CHECKED_IN: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
  READY_FOR_CONSULTATION: { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
  IN_CONSULTATION: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
}

export function TodaysAppointmentsPreview({ appointments, isLoading }: { appointments: TodayAppointment[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#121c1d]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#121c1d]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-8 text-center">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No appointments scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#121c1d]">Today's Schedule</CardTitle>
          <button
            onClick={() => router.push('/doctor/consultations')}
            className="text-xs text-slate-400 hover:text-[#0c5d69] transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {appointments.slice(0, 5).map((apt) => {
            const patientName = apt.patient
              ? `${apt.patient.firstName} ${apt.patient.lastName}`
              : 'Unknown patient';

            return (
              <div
                key={apt.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/doctor/appointments/${apt.id}`)}
              >
                <div className="w-12 text-center shrink-0">
                  <p className="text-sm font-semibold text-[#121c1d] leading-none">{apt.time || '--:--'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#121c1d] truncate">{patientName}</p>
                  <p className="text-xs text-slate-400">{apt.type || 'Consultation'}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
