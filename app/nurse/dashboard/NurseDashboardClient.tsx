'use client';

/**
 * Nurse Dashboard — Surgical Case Focused
 *
 * Clean, organized view centered on surgical case workflow.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Activity,
  HeartPulse,
  ClipboardList,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/patient/useAuth';
import { useQuery } from '@tanstack/react-query';
import { nurseApi } from '@/lib/api/nurse';
import { WardPrepTableRow } from '@/components/nurse/WardPrepTableRow';
import { TheatreSupportTableRow } from '@/components/nurse/TheatreSupportTableRow';
import { RecoveryCaseTableRow } from '@/components/nurse/RecoveryCaseTableRow';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
  DRAFT:                      { label: 'Draft',         pill: 'border border-slate-200 bg-slate-100 text-slate-600 ring-slate-200'      },
  PLANNING:                   { label: 'Planning',      pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_WARD_PREP:        { label: 'Ward Prep',     pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  IN_WARD_PREP:               { label: 'In Ward Prep',  pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_THEATER_BOOKING:  { label: 'Ready for Booking', pill: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300' },
  SCHEDULED:                  { label: 'Scheduled',     pill: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300'      },
  IN_PREP:                    { label: 'In Prep',       pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  IN_THEATER:                 { label: 'In Theater',    pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
  RECOVERY:                   { label: 'Recovery',      pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED:                  { label: 'Completed',     pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED:                  { label: 'Cancelled',     pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
};

function StatCard({ title, value, subtitle, onClick, loading }: { title: string; value: number; subtitle: string; onClick?: () => void; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card
      className={cn(
        'border border-slate-200 transition-all duration-200 cursor-pointer',
        onClick && 'hover:bg-slate-50 hover:border-slate-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function NurseDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const { data: casesData, isLoading: loadingCases } = useQuery({
    queryKey: ['nurse', 'surgical-cases', 'dashboard'],
    queryFn: async () => {
      const res = await nurseApi.getSurgicalCases({ page: 1 });
      if (!res.data?.success) throw new Error((res.data as any)?.error || 'Failed to load cases');
      return res.data;
    },
    staleTime: 30_000,
  });

  const cases = casesData?.data || [];
  const wardPrepCases = cases.filter((c: any) => c.status === 'READY_FOR_WARD_PREP' || c.status === 'IN_WARD_PREP').slice(0, 5);
  const inTheaterCases = cases.filter((c: any) => c.status === 'IN_PREP' || c.status === 'IN_THEATER').slice(0, 5);
  const recoveryCases = cases.filter((c: any) => c.status === 'RECOVERY' || c.status === 'COMPLETED').slice(0, 5);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-500">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">

      {/* ── QUICK STATS ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Ward Prep"
          value={wardPrepCases.length}
          subtitle="Pending checklists"
          loading={loadingCases}
          onClick={() => router.push('/nurse/surgical-cases?status=READY_FOR_WARD_PREP,IN_WARD_PREP')}
        />
        <StatCard
          title="In Theater"
          value={inTheaterCases.length}
          subtitle="Active surgeries"
          loading={loadingCases}
          onClick={() => router.push('/nurse/surgical-cases?status=IN_PREP,IN_THEATER')}
        />
        <StatCard
          title="Recovery"
          value={recoveryCases.length}
          subtitle="PACU monitoring"
          loading={loadingCases}
          onClick={() => router.push('/nurse/surgical-cases?status=RECOVERY,COMPLETED')}
        />
        <StatCard
          title="All Cases"
          value={cases.length}
          subtitle="Total surgical cases"
          loading={loadingCases}
          onClick={() => router.push('/nurse/surgical-cases')}
        />
      </div>

      {/* ── SURGICAL CASES QUICK VIEW ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Column 1: Ward Prep ───────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Ward Prep</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Checklist required</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCases ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : wardPrepCases.length === 0 ? (
              <div className="py-10 text-center">
                <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No ward prep pending</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wardPrepCases.map((c: any) => (
                      <WardPrepTableRow key={c.id} surgicalCase={c} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] text-slate-600 h-8" asChild>
                    <Link href="/nurse/surgical-cases?status=READY_FOR_WARD_PREP,IN_WARD_PREP">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Column 2: In Theater ───────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">In Theater</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Active surgeries</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCases ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : inTheaterCases.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No active surgeries</p>
                <p className="text-[10px] text-slate-400 mt-1">Theater is currently clear</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Theater</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inTheaterCases.map((c) => (
                      <TheatreSupportTableRow key={c.id} surgicalCase={c} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] text-slate-600 h-8" asChild>
                    <Link href="/nurse/surgical-cases?status=IN_PREP,IN_THEATER">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Column 3: Recovery ──────────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Recovery</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">PACU patients</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <HeartPulse className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCases ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : recoveryCases.length === 0 ? (
              <div className="py-10 text-center">
                <HeartPulse className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No patients in recovery</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Surgeon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recoveryCases.map((c) => (
                      <RecoveryCaseTableRow key={c.id} surgicalCase={c} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] text-slate-600 h-8" asChild>
                    <Link href="/nurse/surgical-cases?status=RECOVERY,COMPLETED">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
              <p className="text-[11px] text-slate-500">Common nursing workflows</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/ward-prep">
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                  Ward Checklists
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/theatre-support">
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                  Theatre Board
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/recovery-discharge">
                  <HeartPulse className="h-3.5 w-3.5 mr-1.5" />
                  Recovery
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/patients">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Patients
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
