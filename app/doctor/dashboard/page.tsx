'use client';

import { useDoctorDashboard } from '@/hooks/use-doctor-dashboard';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { DailyQueuePanel } from '@/components/doctor/dashboard/DailyQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { TodaysAppointmentsPreview } from '@/components/doctor/dashboard/TodaysAppointmentsPreview';
import { PendingConfirmationsBanner } from '@/components/doctor/dashboard/PendingConfirmationsBanner';

export default function DoctorDashboardPage() {
  const { data: dashboardData, isLoading } = useDoctorDashboard();

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
        <DashboardStatCards isLoading={isLoading} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DailyQueuePanel appointments={dashboardData?.todayAppointments ?? []} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-1">
          <CasePipeline isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
