'use client';

import { useAuth } from '@/hooks/patient/useAuth';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDoctorDashboard, useDoctorProfile } from '@/hooks/use-doctor-dashboard';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { PatientQueuePanel } from '@/components/doctor/dashboard/PatientQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { SchedulePreview } from '@/components/doctor/dashboard/SchedulePreview';
import { useRouter } from 'next/navigation';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading } = useDoctorDashboard({
    enabled: isAuthenticated && !!user,
  });
  const doctor = useDoctorProfile();
  const router = useRouter();

  const showOnboarding = !doctor && !dashboardLoading;

  const handleStartConsultation = (appointment: any) => {
    router.push(`/doctor/consultations/session/${appointment.id}`);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-100 max-w-sm w-full">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-6 text-sm">Please log in to access your dashboard.</p>
          <Link href="/login">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = dashboardData?.stats?.pendingAppointments ?? 0;
  const todayAppointments = dashboardData?.todayAppointments ?? [];
  const upcomingAppointments = dashboardData?.upcomingAppointments ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Your clinical workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/doctor/schedule">
            <Button variant="outline" size="sm">Schedule</Button>
          </Link>
          <Link href="/doctor/appointments">
            <Button size="sm">Appointments</Button>
          </Link>
        </div>
      </div>

      {/* Pending Confirmations Banner */}
      {pendingCount > 0 && (
        <Link href="/doctor/appointments?tab=pending" className="block">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-700 text-sm font-bold">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {pendingCount} appointment{pendingCount > 1 ? 's' : ''} awaiting confirmation
                </p>
              </div>
              <span className="text-xs text-amber-700 font-medium shrink-0">Review Now →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Stats Row */}
      <section>
        <DashboardStatCards isLoading={dashboardLoading} />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Schedule Preview (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Queue */}
          <PatientQueuePanel />

          {/* Full Schedule Preview */}
          <SchedulePreview
            appointments={todayAppointments.length > 0 ? todayAppointments : upcomingAppointments}
            isLoading={dashboardLoading}
          />
        </div>

        {/* Right: Surgical Pipeline (1 col) */}
        <div className="lg:col-span-1">
          <CasePipeline isLoading={dashboardLoading} />
        </div>
      </div>
    </div>
  );
}
