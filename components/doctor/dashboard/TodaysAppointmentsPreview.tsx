'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import type { DoctorDashboardData } from '@/hooks/use-doctor-dashboard';

type TodayAppointment = DoctorDashboardData['todayAppointments'][number];

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING_DOCTOR_CONFIRMATION: { bg: 'bg-[#e7d6bf]', text: 'text-[#2c2e4b]' },
  SCHEDULED: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  CONFIRMED: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  CHECKED_IN: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  READY_FOR_CONSULTATION: { bg: 'bg-[#e7d6bf]', text: 'text-[#2c2e4b]' },
  IN_CONSULTATION: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  COMPLETED: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' };
}

export function TodaysAppointmentsPreview({ appointments, isLoading }: { appointments: TodayAppointment[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card className="border border-[#e7d6bf] shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e7d6bf]">
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
      <Card className="border border-[#e7d6bf] shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-8 text-center">
          <Clock className="h-8 w-8 text-[#e7d6bf] mx-auto mb-2" />
          <p className="text-sm text-[#2c2e4b]/50">No appointments scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e7d6bf] shadow-sm">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
          <button
            onClick={() => router.push('/doctor/consultations')}
            className="text-xs text-[#caa26a] hover:text-[#2c2e4b] transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {appointments.slice(0, 5).map((apt) => {
            const patientName = apt.patient
              ? `${apt.patient.firstName} ${apt.patient.lastName}`
              : 'Unknown patient';

            return (
              <div
                key={apt.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#e7d6bf]/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/doctor/appointments/${apt.id}`)}
              >
                <div className="w-12 text-center shrink-0">
                  <p className="text-sm font-semibold text-[#2c2e4b] leading-none">{apt.time || '--:--'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2c2e4b] truncate">{patientName}</p>
                  <p className="text-xs text-[#2c2e4b]/60">{apt.type || 'Consultation'}</p>
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
