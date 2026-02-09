'use client';

/**
 * Surgeon Dashboard
 * 
 * Clean, minimal view showing only:
 * - Today's confirmed sessions
 * - Upcoming confirmed sessions
 * - Patient notes and procedure information
 * 
 * No noise. No rejected inquiries. No drafts. No pending items.
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hooks
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorTodayAppointments, useDoctorUpcomingAppointments, useDoctorPendingConfirmations } from '@/hooks/doctor/useDoctorDashboard';
import { useConfirmAppointment } from '@/hooks/doctor/useConsultation';
import { doctorApi } from '@/lib/api/doctor';
import { PendingConfirmationsSection } from '@/components/doctor/PendingConfirmationsSection';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  ArrowRight,
  Activity,
  CheckCircle,
  User,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
import { WaitingQueue } from '@/components/doctor/WaitingQueue';
import { TheatreScheduleView } from '@/components/doctor/TheatreScheduleView';
import { PostOpDashboard } from '@/components/doctor/PostOpDashboard';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [theatreCases, setTheatreCases] = useState<any[]>([]);
  const [loadingTheatre, setLoadingTheatre] = useState(false);
  const router = useRouter();
  const { mutateAsync: confirmAppointment } = useConfirmAppointment();

  // REFACTORED: Hook integration for real-time schedule
  const {
    data: todayAppointments = [],
    isLoading: loadingToday
  } = useDoctorTodayAppointments(user?.id, isAuthenticated && !!user);

  const {
    data: upcomingAppointments = [],
    isLoading: loadingUpcoming
  } = useDoctorUpcomingAppointments(user?.id, isAuthenticated && !!user);

  // Pending confirmations - appointments booked by frontdesk awaiting doctor approval
  const {
    data: pendingConfirmations = [],
    isLoading: loadingPendingConfirmations
  } = useDoctorPendingConfirmations(user?.id, isAuthenticated && !!user);

  const loading = loadingToday || loadingUpcoming;

  // Load theater schedule with CasePlan data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTheatreSchedule();
    }
  }, [isAuthenticated, user]);

  const loadTheatreSchedule = async () => {
    if (!user) return;

    try {
      setLoadingTheatre(true);
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const response = await doctorApi.getTheatreSchedule(startDate, endDate);
      if (response.success && response.data) {
        // ... existing filtering logic ...
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        const relevantCases = response.data.filter((theatreCase: any) => {
          const apt = theatreCase.appointment;
          if (!apt?.time) return true;

          try {
            const [aptHours, aptMinutes] = apt.time.split(':').map(Number);
            if (!isNaN(aptHours) && !isNaN(aptMinutes)) {
              const aptTotalMinutes = aptHours * 60 + aptMinutes;
              const nowTotalMinutes = currentHours * 60 + currentMinutes;
              // 60-minute grace period
              return (aptTotalMinutes + 60) > nowTotalMinutes;
            }
          } catch (e) {
            console.error('Error parsing theatre case time:', apt.time);
          }
          return true;
        });

        setTheatreCases(relevantCases);
      }
    } catch (error) {
      console.error('Error loading theater schedule:', error);
    } finally {
      setLoadingTheatre(false);
    }
  };

  // --- Onboarding / Setup Check ---
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      if (!user) return;
      try {
        // Check if schedule is set
        const availResponse = await doctorApi.getMyAvailability();
        const hasWorkingDays = availResponse.success &&
          availResponse.data?.workingDays?.some((d: any) => d.isAvailable);

        // Check if profile is "complete" (e.g. has bio or specialization)
        // We can infer this from user object or fetch profile.
        // For now, let's rely on availability as the primary "Action" needed.
        if (!hasWorkingDays) {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to check onboarding status", e);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    if (isAuthenticated) {
      checkSetup();
    }
  }, [isAuthenticated, user]);

  const handleStartConsultation = (appointment: any) => {
    // Navigate to the consultation session page — the session page
    // owns the "start consultation" workflow (shows dialog, calls API).
    // This avoids double-start race conditions.
    router.push(`/doctor/consultations/${appointment.id}/session`);
  };

  const handleConfirmAppointment = async (appointmentId: number, notes?: string) => {
    await confirmAppointment({
      appointmentId,
      action: 'confirm',
      notes
    });
  };

  const handleRejectAppointment = async (appointmentId: number, reason: string) => {
    await confirmAppointment({
      appointmentId,
      action: 'reject',
      rejectionReason: reason
    });
  };

  if (isLoading) {
    // ... existing loading ... (omitted for brevity in replacement if matching exact block)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-slate-300" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Preparing clinical workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-8">Please log in to your clinical account to access the dashboard.</p>
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const upcomingCount = upcomingAppointments.length;
  const todayCount = todayAppointments.length;
  const checkedInCount = todayAppointments.filter(a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION').length;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sticky Header - Profile-Centric Design */}
      <header className="sticky top-0 z-40 -mx-4 sm:-mx-5 lg:-mx-8 xl:-mx-10 px-4 sm:px-5 lg:px-8 xl:px-10 py-3 mb-5 bg-white/80 backdrop-blur-md border-b border-slate-100/60">
        <div className="flex items-center justify-between">
          {/* Profile Section */}
          <div className="flex items-center gap-3">
            {/* Doctor Avatar */}
            <div className="relative">
              <div className="h-11 w-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-700 text-white text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            
            {/* Name & Context */}
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-slate-900 leading-tight">
                Dr. {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-700">Online</span>
            </div>
            
            <NotificationBell />
            
            {/* Quick Profile Link */}
            <Link href="/doctor/profile">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="space-y-6">

      {/* Onboarding Widget */}
      {showOnboarding && !checkingOnboarding && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="h-32 w-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Welcome, Dr. {user?.firstName || 'Doctor'}!</h2>
            <p className="text-indigo-100 mb-6 max-w-xl">
              Your account is active. To start receiving appointments, please configure your weekly availability and complete your professional profile.
            </p>
            <div className="flex gap-4">
              <Button asChild variant="secondary" className="font-semibold">
                <Link href="/doctor/profile">
                  Complete Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cluster - Refined Compact Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        {pendingConfirmations.length > 0 && (
          <StatCard
            title="Needs Review"
            value={pendingConfirmations.length}
            subtitle="Pending confirmations"
            icon={AlertCircle}
            color="amber"
            pulse
          />
        )}
        <StatCard
          title="Today's Caseload"
          value={todayCount}
          subtitle={`${checkedInCount} arrived / waiting`}
          icon={Calendar}
          color="teal"
        />
        <StatCard
          title="Arrived Now"
          value={checkedInCount}
          subtitle="Ready for consultation"
          icon={CheckCircle}
          color="emerald"
          pulse={checkedInCount > 0}
        />
        <StatCard
          title="Upcoming View"
          value={upcomingCount}
          subtitle="Next 7 days"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Efficiency"
          value="94%"
          subtitle="+3% from last week"
          icon={Activity}
          color="indigo"
        />
      </div>

      {/* Main Content Layout: Balanced Clinical View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* Left Column: Active Patient Flow (8 cols) */}
        <div className="xl:col-span-8 space-y-8">

          {/* Pending Confirmations - Action items for doctor */}
          <PendingConfirmationsSection
            appointments={pendingConfirmations}
            onConfirm={handleConfirmAppointment}
            onReject={handleRejectAppointment}
            isLoading={loadingPendingConfirmations}
          />

          {/* Waiting Queue - Checked-in patients ready for consultation */}
          {todayAppointments.some(a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION') && (
            <WaitingQueue
              appointments={todayAppointments.filter(a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION')}
              onStartConsultation={(apt) => handleStartConsultation(apt)}
            />
          )}

          <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-800">Today's Patient Flow</h2>
              </div>
              <Link href="/doctor/appointments">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900 font-medium gap-1">
                  Full Calendar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="p-4">
              {loading ? (
                <ScheduleSkeleton />
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/30 rounded-lg border border-dashed border-slate-200">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">Workspace Clear</h3>
                  <p className="text-xs text-slate-500">No sessions scheduled for today yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments
                    // Filter out already checked-in patients from main list to avoid duplication if desired, 
                    // OR keep them. Let's keep them but sorted: In Consultation -> Scheduled. 
                    // Waiting ones are already shown above.
                    .filter(a => a.status !== 'CHECKED_IN' && a.status !== 'READY_FOR_CONSULTATION')
                    .map((appointment) => (
                      <DoctorAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onStartConsultation={handleStartConsultation}
                        onEndConsultation={(apt: any) => {
                          // TODO: Open End Consultation Logic/Dialog
                          // For Phase 1, we can redirect or just log
                          console.log('End session', apt);
                        }}
                      />
                    ))}

                  {todayAppointments.filter(a => a.status !== 'CHECKED_IN' && a.status !== 'READY_FOR_CONSULTATION').length === 0 && (
                    <p className="text-center text-slate-500 py-4">
                      All active patients are in the waiting queue.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
              <Clock className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-800">Upcoming Schedule</h2>
            </div>
            <div className="p-4">
              {loading ? (
                <ScheduleSkeleton count={2} />
              ) : upcomingAppointments.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400 font-medium">No sessions scheduled for the next 48 hours.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 3).map((appointment) => (
                    <DoctorAppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Theatre Monitoring & Stats (4 cols) */}
        <div className="xl:col-span-4 space-y-5">
          <section className="sticky top-6 space-y-5">
            {/* Theatre Schedule - Specialized View */}
            <div className="transform transition-transform hover:scale-[1.01] duration-300">
              <TheatreScheduleView
                cases={theatreCases}
                loading={loadingTheatre}
              />
            </div>

            {/* Post-Op Live Monitor */}
            <div className="transform transition-transform hover:scale-[1.01] duration-300">
              <PostOpDashboard cases={[]} loading={false} />
            </div>

            {/* Quick Shortcuts */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
              <div className="absolute -right-8 -bottom-8 h-24 w-24 bg-teal-500/10 rounded-full blur-2xl" />
              <h3 className="text-xs font-semibold mb-3 text-slate-300 uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2 relative z-10">
                <ToolButton icon={FileText} label="Notes" />
                <ToolButton icon={Users} label="Referrals" />
                <ToolButton icon={Activity} label="Vitals" />
                <ToolButton icon={ExternalLink} label="Portal" />
              </div>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}

/* Sub-components for a cleaner layout */

function StatCard({ title, value, subtitle, icon: Icon, color, pulse }: any) {
  const colorClasses: any = {
    indigo: "text-indigo-600 bg-indigo-50/80",
    emerald: "text-emerald-600 bg-emerald-50/80",
    amber: "text-amber-600 bg-amber-50/80",
    blue: "text-sky-600 bg-sky-50/80",
    slate: "text-slate-600 bg-slate-100/80",
    teal: "text-teal-600 bg-teal-50/80",
  };

  const borderAccents: any = {
    indigo: "hover:border-indigo-200",
    emerald: "hover:border-emerald-200",
    amber: "hover:border-amber-200",
    blue: "hover:border-sky-200",
    slate: "hover:border-slate-300",
    teal: "hover:border-teal-200",
  };

  const pulseColors: any = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
    slate: "bg-slate-500",
    teal: "bg-teal-500",
  };

  return (
    <Card className={cn(
      "group relative border-slate-200/60 shadow-sm transition-all hover:shadow duration-200 overflow-hidden rounded-xl bg-white/80",
      borderAccents[color]
    )}>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</CardTitle>
          <div className={cn("p-1.5 rounded-lg transition-transform group-hover:scale-105", colorClasses[color])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800 tracking-tight">{value}</span>
          {pulse && <span className={cn("h-2 w-2 rounded-full animate-pulse self-center", pulseColors[color] || "bg-emerald-500")} />}
        </div>
        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ToolButton({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white/5 hover:bg-teal-500/20 border border-white/5 hover:border-teal-500/30 transition-all text-slate-400 hover:text-teal-300">
      <Icon className="h-4 w-4 mb-1" />
      <span className="text-[9px] font-medium">{label}</span>
    </button>
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
