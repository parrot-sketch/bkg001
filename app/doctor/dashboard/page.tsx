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
import { useDoctorTodayAppointments, useDoctorUpcomingAppointments } from '@/hooks/doctor/useDoctorDashboard';
import { doctorApi } from '@/lib/api/doctor';
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
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
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

  // REFACTORED: Hook integration for real-time schedule
  const {
    data: todayAppointments = [],
    isLoading: loadingToday
  } = useDoctorTodayAppointments(user?.id, isAuthenticated && !!user);

  const {
    data: upcomingAppointments = [],
    isLoading: loadingUpcoming
  } = useDoctorUpcomingAppointments(user?.id, isAuthenticated && !!user);

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
        // Filter for clinical relevance: only show current/future cases
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

  const handleStartConsultation = (appointment: any) => {
    router.push(`/doctor/consultations/${appointment.id}/session`);
  };

  if (isLoading) {
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
  const checkedInCount = todayAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100/60 mb-2">
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/10 transition-transform hover:scale-105 duration-300">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
                {user.firstName ? `Dr. ${user.firstName}` : "Clinical Board"}
              </h1>
              <p className="text-slate-500 font-bold flex items-center gap-3">
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                Surgeon Control Center • {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-10 px-4 items-center bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            System Live
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Stats Cluster - Modern Bento Grid style */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Caseload"
          value={todayCount}
          subtitle={`${checkedInCount} arrived / waiting`}
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Arrived Now"
          value={checkedInCount}
          subtitle="Ready for consultation"
          icon={CheckCircle}
          color="emerald"
          pulse
        />
        <StatCard
          title="Upcoming View"
          value={upcomingCount}
          subtitle="Next 7 days"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Clinical Efficiency"
          value="94%"
          subtitle="+3% from last week"
          icon={Activity}
          color="slate"
        />
      </div>

      {/* Main Content Layout: Balanced Clinical View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Left Column: Active Patient Flow (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-900" />
                <h2 className="text-xl font-bold text-slate-900">Today's Patient Flow</h2>
              </div>
              <Link href="/doctor/appointments">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 font-bold gap-1">
                  Full Calendar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="p-6">
              {loading ? (
                <ScheduleSkeleton />
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Workspace Clear</h3>
                  <p className="text-sm text-slate-500">No sessions scheduled for today yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <DoctorAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStartConsultation={handleStartConsultation}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <Clock className="h-5 w-5 text-slate-900" />
              <h2 className="text-xl font-bold text-slate-900">Upcoming Schedule</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <ScheduleSkeleton count={2} />
              ) : upcomingAppointments.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400 font-medium">No sessions scheduled for the next 48 hours.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 3).map((appointment) => (
                    <DoctorAppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Theatre Monitoring & Stats (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
          <section className="sticky top-8 space-y-8">
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
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 ring-1 ring-white/10 overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                Clinical Toolbox
              </h3>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <ToolButton icon={FileText} label="Draft Notes" />
                <ToolButton icon={Users} label="Referrals" />
                <ToolButton icon={Activity} label="Vitals Log" />
                <ToolButton icon={ExternalLink} label="Portal" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* Sub-components for a cleaner layout */

function StatCard({ title, value, subtitle, icon: Icon, color, pulse }: any) {
  const colorClasses: any = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-500/10",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-500/10",
    amber: "text-amber-600 bg-amber-50 border-amber-100 shadow-amber-500/10",
    slate: "text-slate-600 bg-slate-50 border-slate-100 shadow-slate-500/10",
  };

  return (
    <Card className="group relative border-slate-200 hover:border-slate-300 shadow-sm transition-all hover:shadow-md duration-300 overflow-hidden rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</CardTitle>
          <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
          {pulse && <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse self-center mb-1" />}
        </div>
        <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ToolButton({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-300 hover:text-white">
      <Icon className="h-6 w-6 mb-2 text-slate-400" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
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
