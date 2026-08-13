'use client';

import { useState, useCallback } from 'react';
import { useDoctorDashboard } from '@/hooks/use-doctor-dashboard';
import { useDoctorQueue, type UseDoctorQueueOptions } from '@/hooks/doctor/useDoctorQueue';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { DailyQueuePanel } from '@/components/doctor/dashboard/DailyQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { TodaysAppointmentsPreview } from '@/components/doctor/dashboard/TodaysAppointmentsPreview';
import { PendingConfirmationsBanner } from '@/components/doctor/dashboard/PendingConfirmationsBanner';

export default function DoctorDashboardPage() {
  const { data: dashboardData, isLoading: dashboardLoading } = useDoctorDashboard();
  const [queueDateRange, setQueueDateRange] = useState<UseDoctorQueueOptions>({});
  
  const { data: queue, isLoading: queueLoading } = useDoctorQueue(dashboardData?.doctor?.id, {
    ...queueDateRange,
    enabled: !!dashboardData?.doctor?.id,
  });

  const handleQueueDateRangeChange = useCallback((startDate: string | undefined, endDate: string | undefined) => {
    setQueueDateRange({ startDate, endDate });
  }, []);

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
            queue={queue ?? []} 
            isLoading={dashboardLoading || queueLoading} 
            onDateRangeChange={handleQueueDateRangeChange}
          />
        </div>

        <div className="lg:col-span-1">
          <CasePipeline isLoading={dashboardLoading} />
        </div>
      </div>
    </div>
  );
}
