'use client';

import { useAuth } from '@/hooks/patient/useAuth';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDoctorDashboard } from '@/hooks/use-doctor-dashboard';
import { DashboardStatCards } from '@/components/doctor/dashboard/DashboardStatCards';
import { PatientQueuePanel } from '@/components/doctor/dashboard/PatientQueuePanel';
import { CasePipeline } from '@/components/doctor/dashboard/CasePipeline';
import { OnboardingWidget } from '@/components/doctor/dashboard/OnboardingWidget';
import { TodaysAppointmentsPreview } from '@/components/doctor/dashboard/TodaysAppointmentsPreview';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading } = useDoctorDashboard({
    enabled: isAuthenticated && !!user,
  });

  const pendingCount = dashboardData?.stats?.pendingAppointments ?? 0;
  const doctor = dashboardData?.doctor ?? null;
  const onboardingStatus = doctor?.onboardingStatus ?? null;
  const showOnboarding = onboardingStatus != null && onboardingStatus !== 'ACTIVE';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-slate-100 border-t-[#0c5d69] animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-[#121c1d] mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-6 text-sm">Please log in to access your dashboard.</p>
          <Link href="/login">
            <Button size="lg" className="w-full bg-[#0c5d69] hover:bg-[#0a4f59] text-white">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121c1d]">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Your clinical workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/doctor/schedule">
            <Button variant="outline" size="sm" className="rounded-lg">Schedule</Button>
          </Link>
          <Link href="/doctor/appointments">
            <Button size="sm" className="bg-[#0c5d69] hover:bg-[#0a4f59] text-white rounded-lg">Appointments</Button>
          </Link>
          <Link href="/doctor/profile" id="tour-profile-link-dashboard">
            <Button variant="outline" size="sm" className="rounded-lg">Profile</Button>
          </Link>
        </div>
      </div>

      <OnboardingWidget show={showOnboarding} isLoading={dashboardLoading} />

      {/* Pending Confirmations Banner */}
      {pendingCount > 0 && (
        <Link href="/doctor/appointments?tab=pending" className="block">
          <div className="p-4 bg-[#fdf6e3] border border-[#DFAC0D]/20 rounded-xl hover:bg-[#fdf6e3]/80 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[#DFAC0D]/10 flex items-center justify-center shrink-0">
                <span className="text-[#78350f] text-sm font-bold">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#121c1d]">
                  {pendingCount} appointment{pendingCount > 1 ? 's' : ''} awaiting confirmation
                </p>
              </div>
              <span className="text-xs text-[#78350f] font-medium shrink-0">Review Now →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Stats Row */}
      <section>
        <DashboardStatCards isLoading={dashboardLoading} />
      </section>

      {/* Today's Schedule Preview */}
      <TodaysAppointmentsPreview appointments={dashboardData?.todayAppointments ?? []} isLoading={dashboardLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Patient Queue (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <PatientQueuePanel />
        </div>

        {/* Right: Surgical Pipeline (1 col) */}
        <div className="lg:col-span-1">
          <CasePipeline isLoading={dashboardLoading} />
        </div>
      </div>
    </div>
  );
}
