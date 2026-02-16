'use client';

/**
 * Nurse Dashboard Overview
 *
 * Main dashboard page showing Work Queues for the surgical workflow.
 * Refactored for modern, professional aesthetic consistent with Doctor dashboard.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayCheckedInPatients } from '@/hooks/nurse/useNurseDashboard';
import { usePreOpSummary } from '@/hooks/nurse/usePreOpCases';
import { useIntraOpCases } from '@/hooks/nurse/useIntraOpCases';
import { useRecoveryCases } from '@/hooks/nurse/useRecoveryCases';

import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  Activity,
  HeartPulse,
  Users,
  Calendar,
  ArrowRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';
import { NurseStatCard } from '@/components/nurse/NurseStatCard';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function NurseDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // 1. Clinic Patients (Appointments)
  const {
    data: checkedInPatients = [],
    isLoading: loadingCheckedIn
  } = useTodayCheckedInPatients(isAuthenticated && !!user);

  // 2. Ward Prep (Pre-Op Cases)
  const {
    summary: preOpSummary,
    isLoading: loadingPreOp
  } = usePreOpSummary();

  // 3. Theatre Support (Intra-Op Cases)
  const {
    data: intraOpData,
    isLoading: loadingIntraOp
  } = useIntraOpCases();

  // 4. Recovery (Post-Op Cases)
  const {
    data: recoveryData,
    isLoading: loadingRecovery
  } = useRecoveryCases();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
        <p className="text-muted-foreground">Please log in to access your dashboard</p>
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-8">

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Link href="/nurse/ward-prep" className="block transition-transform hover:-translate-y-1 duration-200">
            <NurseStatCard
              title="Ward Prep"
              value={preOpSummary?.total || 0}
              subtitle="Pending admission/prep"
              icon={ClipboardCheck}
              color="amber"
              loading={loadingPreOp}
              pulse={(preOpSummary?.total || 0) > 0}
            />
          </Link>

          <Link href="/nurse/theatre-support" className="block transition-transform hover:-translate-y-1 duration-200">
            <NurseStatCard
              title="In Theater"
              value={intraOpData?.cases.length || 0}
              subtitle="Active surgeries"
              icon={Activity}
              color="blue"
              loading={loadingIntraOp}
              pulse={(intraOpData?.cases.length || 0) > 0}
            />
          </Link>

          <Link href="/nurse/recovery-discharge" className="block transition-transform hover:-translate-y-1 duration-200">
            <NurseStatCard
              title="Recovery"
              value={recoveryData?.cases.length || 0}
              subtitle="PACU monitoring"
              icon={HeartPulse}
              color="emerald"
              loading={loadingRecovery}
            />
          </Link>

          <Link href="/nurse/patients" className="block transition-transform hover:-translate-y-1 duration-200">
            <NurseStatCard
              title="Clinic Queue"
              value={checkedInPatients.length}
              subtitle="Waiting for consultation"
              icon={Users}
              color="purple"
              loading={loadingCheckedIn}
            />
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Left Column: Active Surgeries & Clinic Flow (8 cols) */}
          <div className="xl:col-span-8 space-y-6">

            {/* Active Surgeries Section */}
            <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-slate-800">Active Theater Cases</h2>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium text-slate-500 hover:text-blue-600">
                  <Link href="/nurse/theatre-support">
                    View Board <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              <div className="p-0">
                {loadingIntraOp ? (
                  <div className="p-6 space-y-3">
                    <div className="h-16 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />
                    <div className="h-16 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />
                  </div>
                ) : intraOpData?.cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white">
                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No active surgeries</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Theater is currently clear. Check Ward Prep for upcoming cases.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {intraOpData?.cases.map((c) => (
                      <Link key={c.id} href={`/nurse/intra-op-cases/${c.id}/record`} className="block hover:bg-slate-50/80 transition-colors group">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs ring-4 ring-white">
                              {c.patient?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                {c.patient?.fullName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                                  {c.procedureName}
                                </Badge>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Started {c.startTime ? format(new Date(c.startTime), 'HH:mm') : '--:--'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px] tracking-wider font-bold">
                              {c.theaterName || 'OR Main'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-medium">Click to manage</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Clinic Queue Section */}
            <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  <h2 className="text-sm font-semibold text-slate-800">Clinic Waiting Room</h2>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium text-slate-500 hover:text-purple-600">
                  <Link href="/nurse/patients">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              <div className="p-4 grid gap-3 sm:grid-cols-2">
                {loadingCheckedIn ? (
                  <>
                    <div className="h-20 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />
                    <div className="h-20 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />
                  </>
                ) : checkedInPatients.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                    No patients waiting in the clinic area.
                  </div>
                ) : (
                  checkedInPatients.slice(0, 6).map((apt) => (
                    <Link key={apt.id} href="/nurse/patients" className="group">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-sm transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold">
                            P
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">Patient #{apt.patientId?.substring(0, 6)}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {format(new Date(apt.appointmentDate), 'h:mm a')} • {apt.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

          </div>

          {/* Right Column: Quick Actions & Status (4 cols) */}
          <div className="xl:col-span-4 space-y-6">

            {/* Ward Prep Status Summary */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-500" />
                Ward Efficiency
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pending Prep</span>
                  <span className="font-medium text-slate-900">{preOpSummary?.total || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(((preOpSummary?.total || 0) / 10) * 100, 100)}%` }}
                  />
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link href="/nurse/ward-prep">Go to Ward Checklist</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg overflow-hidden relative">
              <div className="absolute -right-6 -bottom-6 h-24 w-24 bg-rose-500/20 rounded-full blur-2xl" />
              <h3 className="text-xs font-semibold mb-4 text-slate-300 uppercase tracking-wide">
                Quick Launch
              </h3>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <Link href="/nurse/patients" className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-slate-300 hover:text-white group">
                  <Activity className="h-5 w-5 mb-2 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">Record Vitals</span>
                </Link>
                <Link href="/nurse/ward-prep" className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-slate-300 hover:text-white group">
                  <ClipboardCheck className="h-5 w-5 mb-2 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">Admit Patient</span>
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
