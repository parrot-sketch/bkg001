'use client';

/**
 * Frontdesk Dashboard — Redesigned
 *
 * Primary surface for frontdesk staff. Today's patient queue is front-and-center.
 * Layout:
 *   - Header: profile, date, on-duty badge, notifications
 *   - Pipeline bar: visual status counters for today's flow
 *   - Main (8/12): Today's live patient queue (TodaysSchedule)
 *   - Sidebar (4/12): Quick actions + Shift summary + Doctors on duty
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDashboardData } from '@/components/frontdesk/hooks/useDashboardData';
import { useTheaterSchedulingQueue } from '@/hooks/frontdesk/useTheaterScheduling';
import { TodaysSchedule } from '@/components/frontdesk/TodaysSchedule';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  QrCode,
  FileText,
  Loader2,
  Users,
  CheckCircle,
  ArrowRight,
  User,
  Activity,
  ClipboardList,
  Building2,
  Stethoscope,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { BookingChannel } from '@/domain/enums/BookingChannel';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { stats, loading } = useDashboardData();
  const { data: theaterSchedulingData, isLoading: loadingTheaterScheduling } =
    useTheaterSchedulingQueue(isAuthenticated && !!user);
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-cyan-500 animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-slate-300" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Loading reception desk...</p>
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
          <p className="text-slate-500 mb-8">Please log in to access the reception dashboard.</p>
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Derive completion progress
  const totalExpected = stats.expectedPatients;
  const totalProcessed = stats.completedToday ?? 0;
  const progressPct = totalExpected > 0 ? Math.round((totalProcessed / totalExpected) * 100) : 0;

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 -mx-4 sm:-mx-5 lg:-mx-8 xl:-mx-10 px-4 sm:px-5 lg:px-8 xl:px-10 py-3 mb-5 bg-white/80 backdrop-blur-md border-b border-slate-100/60">
        <div className="flex items-center justify-between">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-cyan-700 text-white text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-slate-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Reception Desk • {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 border border-cyan-100 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] font-medium text-cyan-700">On Duty</span>
            </div>
            <NotificationBell />
            <Link href="/frontdesk/profile">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {/* ── Pipeline Bar: Live counts across the patient journey ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PipelineCard
            label="Arriving Today"
            value={stats.pendingCheckIns}
            icon={Calendar}
            color="blue"
            loading={loading}
          />
          <PipelineCard
            label="In Waiting Room"
            value={stats.checkedInPatients}
            icon={Clock}
            color="amber"
            loading={loading}
          />
          <PipelineCard
            label="In Consultation"
            value={stats.inConsultation ?? 0}
            icon={Stethoscope}
            color="violet"
            loading={loading}
          />
          <PipelineCard
            label="Completed Today"
            value={stats.completedToday ?? 0}
            icon={CheckCircle2}
            color="emerald"
            loading={loading}
          />
        </section>

        {/* ── Main Content ── */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Primary: Today's Patient Queue */}
          <div className="xl:col-span-8">
            <TodaysSchedule />
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 space-y-4">

            {/* Quick Actions */}
            <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div onClick={() => router.push('/frontdesk/patients?mode=book')}>
                  <QuickActionBtn
                    href="#"
                    icon={Plus}
                    label="New Appointment"
                    color="cyan"
                  />
                </div>
                <QuickActionBtn
                  href="/frontdesk/intake/start"
                  icon={QrCode}
                  label="Walk-in Intake"
                  color="indigo"
                />
                <QuickActionBtn
                  href="/frontdesk/theater-scheduling"
                  icon={Building2}
                  label={
                    theaterSchedulingData && theaterSchedulingData.count > 0
                      ? `Theater Queue (${theaterSchedulingData.count})`
                      : 'Theater Scheduling'
                  }
                  color="blue"
                  pulse={!!(theaterSchedulingData && theaterSchedulingData.count > 0)}
                />
                <QuickActionBtn
                  href="/frontdesk/patients"
                  icon={Users}
                  label="Patient Registry"
                  color="slate"
                />
                <QuickActionBtn
                  href="/frontdesk/billing"
                  icon={FileText}
                  label="Billing & Payments"
                  color="slate"
                />
              </CardContent>
            </Card>

            {/* Shift Summary */}
            <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 text-white">
              <CardHeader className="py-3 px-4 border-b border-white/10">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Shift Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <ShiftRow label="Total Booked" value={stats.expectedPatients} valueClass="text-white" />
                  <ShiftRow label="Arrived & Waiting" value={stats.checkedInPatients} valueClass="text-amber-400" />
                  <ShiftRow label="In Consultation" value={stats.inConsultation ?? 0} valueClass="text-violet-400" />
                  <ShiftRow label="Completed" value={stats.completedToday ?? 0} valueClass="text-emerald-400" />

                  {/* Progress bar */}
                  <div className="pt-1">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                      {totalExpected > 0
                        ? `${progressPct}% of appointments completed`
                        : 'No appointments scheduled today'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Intakes alert (only when non-zero) */}
            {stats.pendingIntakeCount > 0 && (
              <Link href="/frontdesk/intake/pending">
                <Card className="border-indigo-200 bg-indigo-50 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100">
                      <ClipboardList className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-800">Pending Intakes</p>
                      <p className="text-xs text-indigo-600">{stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function PipelineCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'amber' | 'violet' | 'emerald';
  loading?: boolean;
}) {
  const styles: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-500', text: 'text-violet-700', border: 'border-violet-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
  };
  const s = styles[color];
  const isActive = value > 0;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border bg-white transition-all',
      isActive ? s.border : 'border-slate-100',
    )}>
      <div className={cn('p-2 rounded-lg', s.bg)}>
        <Icon className={cn('h-4 w-4', s.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-tight">{label}</p>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-300 mt-1" />
        ) : (
          <p className={cn('text-xl font-bold', isActive ? s.text : 'text-slate-300')}>{value}</p>
        )}
      </div>
      {isActive && (
        <span className={cn('ml-auto h-2 w-2 rounded-full animate-pulse shrink-0',
          color === 'blue' ? 'bg-blue-400' :
            color === 'amber' ? 'bg-amber-400' :
              color === 'violet' ? 'bg-violet-400' : 'bg-emerald-400'
        )} />
      )}
    </div>
  );
}

function QuickActionBtn({
  href, icon: Icon, label, color, pulse = false,
}: {
  href: string;
  icon: any;
  label: string;
  color: 'cyan' | 'indigo' | 'blue' | 'slate';
  pulse?: boolean;
}) {
  const styles: Record<string, { hover: string; iconBg: string; iconColor: string }> = {
    cyan: { hover: 'hover:bg-cyan-50 hover:border-cyan-200', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
    indigo: { hover: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    blue: { hover: 'hover:bg-blue-50 hover:border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    slate: { hover: 'hover:bg-slate-50 hover:border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
  };
  const s = styles[color];

  return (
    href === '#' ? (
      <div className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg border border-transparent transition-all group cursor-pointer',
        s.hover,
      )}>
        <div className={cn('p-1.5 rounded-md relative shrink-0', s.iconBg)}>
          <Icon className={cn('h-3.5 w-3.5', s.iconColor)} />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 flex-1 min-w-0 truncate">{label}</span>
        <ArrowRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" />
      </div>
    ) : (
      <Link href={href}>
        <div className={cn(
          'flex items-center gap-3 p-2.5 rounded-lg border border-transparent transition-all group cursor-pointer',
          s.hover,
        )}>
          <div className={cn('p-1.5 rounded-md relative shrink-0', s.iconBg)}>
            <Icon className={cn('h-3.5 w-3.5', s.iconColor)} />
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 flex-1 min-w-0 truncate">{label}</span>
          <ArrowRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" />
        </div>
      </Link>
    )
  );
}

function ShiftRow({ label, value, valueClass }: { label: string; value: number; valueClass: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn('text-lg font-bold', valueClass)}>{value}</span>
    </div>
  );
}
