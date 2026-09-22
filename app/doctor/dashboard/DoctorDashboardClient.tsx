'use client';

import { useMemo } from 'react';
import { useDoctorDashboard } from '@/hooks/use-doctor-dashboard';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { DailyQueuePanel } from '@/components/doctor/dashboard/DailyQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { PendingConfirmationsBanner } from '@/components/doctor/dashboard/PendingConfirmationsBanner';

export default function DoctorDashboardPage() {
  // Single server-action fetch — do not also poll /api/doctor/.../queue here
  // (that duplicated the same patients every 60s on top of the dashboard payload).
  const { data: dashboardData, isLoading: dashboardLoading } = useDoctorDashboard();

  const queue = useMemo<QueuePatient[]>(() => {
    return (dashboardData?.queue ?? []).map((q) => {
      const parts = (q.patientName || '').trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ');
      return {
        id: q.id,
        patientId: q.patientId,
        patient: {
          id: q.patientId,
          firstName,
          lastName,
          fileNumber: q.patientFileNumber,
        },
        appointmentId: q.appointmentId,
        appointmentDate: null,
        time: q.appointmentTime,
        type: q.type,
        status: q.appointmentStatus || q.status,
        addedAt: q.addedAt,
        waitTime: q.waitTime,
        notes: null,
        isWalkIn: q.isWalkIn,
      };
    });
  }, [dashboardData?.queue]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-white/70 mt-0.5">
            {dashboardData?.doctor ? `Dr. ${dashboardData.doctor.firstName} ${dashboardData.doctor.lastName}` : 'Your clinical workspace'}
          </p>
        </div>
      </div>

      <PendingConfirmationsBanner 
        pendingCount={dashboardData?.stats?.pendingAppointments ?? 0} 
        pendingAppointmentIds={dashboardData?.stats?.pendingAppointmentIds ?? []} 
      />

      <section>
        <DashboardStatCards isLoading={dashboardLoading} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DailyQueuePanel 
            queue={queue} 
            isLoading={dashboardLoading} 
          />
        </div>

        <div className="lg:col-span-1">
          <CasePipeline isLoading={dashboardLoading} />
        </div>
      </div>
    </div>
  );
}
