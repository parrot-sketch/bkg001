'use client';

/**
 * Nurse Dashboard Overview
 *
 * Main dashboard page showing Work Queues for the surgical workflow.
 * Refactored for modern, professional aesthetic consistent with Doctor dashboard.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayCheckedInPatients } from '@/hooks/nurse/useNurseDashboard';
import { usePreOpSummary, usePreOpCases } from '@/hooks/nurse/usePreOpCases';
import { useIntraOpCases } from '@/hooks/nurse/useIntraOpCases';
import { useRecoveryCases } from '@/hooks/nurse/useRecoveryCases';
import { useMarkInTheater } from '@/hooks/nurse/useMarkInTheater';

import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Clock,
  Calendar
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

  // Pre-op cases for "Ready for Theater" section
  const {
    data: preOpCasesData,
    isLoading: loadingPreOpCases
  } = usePreOpCases();

  // Filter cases in IN_PREP status (ready for theater)
  const readyForTheaterCases = preOpCasesData?.cases.filter(
    (c) => c.status === 'IN_PREP'
  ) || [];

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

  // Mark in theater mutation
  const markInTheater = useMarkInTheater();

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
              color="emerald"
              loading={loadingRecovery}
            />
          </Link>

          <Link href="/nurse/patients" className="block transition-transform hover:-translate-y-1 duration-200">
            <NurseStatCard
              title="Clinic Queue"
              value={checkedInPatients.length}
              subtitle="Waiting for consultation"
              color="purple"
              loading={loadingCheckedIn}
            />
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Left Column: Active Surgeries & Clinic Flow (8 cols) */}
          <div className="xl:col-span-8 space-y-6">

            {/* Ready for Theater Section - NEW */}
            {readyForTheaterCases.length > 0 && (
              <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-semibold text-slate-900">Ready for Theater</h2>
                    <Badge variant="outline" className="text-slate-700 border-slate-300 text-[10px]">
                      {readyForTheaterCases.length}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {readyForTheaterCases.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-lg border border-amber-200/50 p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                            {c.patient?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-slate-900">
                              {c.patient?.fullName || 'Unknown Patient'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-slate-100 text-slate-600">
                                {c.procedureName}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-slate-700 border-slate-200">
                                Pre-op Complete
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            markInTheater.mutate(c.id);
                          }}
                          disabled={markInTheater.isPending}
                        >
                          {markInTheater.isPending ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Marking...
                            </>
                          ) : (
                            "Mark in Theater"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {readyForTheaterCases.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-xs" asChild>
                        <Link href="/nurse/ward-prep">
                          View {readyForTheaterCases.length - 3} more <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Active Surgeries Section */}
            <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Active Theater Cases</h2>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium text-slate-600 hover:text-slate-900">
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
                    <p className="text-sm font-medium text-slate-900">No active surgeries</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Theater is currently clear. Check Ward Prep for upcoming cases.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {intraOpData?.cases.map((c) => (
                      <Link key={c.id} href={`/nurse/intra-op-cases/${c.id}/record`} className="block hover:bg-slate-50/80 transition-colors group">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs ring-4 ring-white">
                              {c.patient?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
                                {c.patient?.fullName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                                  {c.procedureName}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-slate-700 border-slate-200">
                                  IN_THEATER
                                </Badge>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Started {c.startTime ? format(new Date(c.startTime), 'HH:mm') : '--:--'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-slate-700 border-slate-200 uppercase text-[10px] tracking-wider font-bold">
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
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Clinic Waiting Room</h2>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium text-slate-600 hover:text-slate-900">
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
                      <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
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
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Ward Efficiency
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pending Prep</span>
                  <span className="font-medium text-slate-900">{preOpSummary?.total || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-slate-900 h-1.5 rounded-full"
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
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm overflow-hidden">
              <h3 className="text-xs font-semibold mb-4 text-slate-600 uppercase tracking-wide">
                Quick Launch
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/nurse/patients" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-700 hover:text-slate-900">
                  <span className="text-[10px] font-medium">Record Vitals</span>
                </Link>
                <Link href="/nurse/ward-prep" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-700 hover:text-slate-900">
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
