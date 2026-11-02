'use client';

import { useMemo } from 'react';
import { useDoctorDashboard, type DoctorDashboardData } from '@/hooks/use-doctor-dashboard';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { DailyQueuePanel } from '@/components/doctor/dashboard/DailyQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { PendingConfirmationsBanner } from '@/components/doctor/dashboard/PendingConfirmationsBanner';

export default function DoctorDashboardPage({ initialData }: { initialData?: DoctorDashboardData }) {
  // The server page already loaded this payload. React Query keeps it fresh
  // after the first paint instead of blocking the dashboard on a second request.
  const { data: dashboardData, isLoading: dashboardLoading } = useDoctorDashboard({ initialData });

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
        <DashboardStatCards isLoading={dashboardLoading} stats={dashboardData?.stats} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DailyQueuePanel 
            queue={queue} 
            isLoading={dashboardLoading} 
          />
        </div>

        <div className="lg:col-span-1">
          <CasePipeline isLoading={dashboardLoading} cases={dashboardData?.surgicalCases} />
        </div>
      </div>
    </div>
  );
}
