'use client';

/**
 * Nurse Dashboard
 *
 * Two focused modes:
 * - Front desk: same clinic ops as frontdesk (queue, intake, check-in, assign)
 * - Clinical: ward / intra / post journey boards
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Activity,
  HeartPulse,
  ClipboardList,
  FolderKanban,
  RefreshCw,
  CalendarIcon,
  QrCode,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCases } from '@/hooks/nurse/usePreOpCases';
import { useIntraOpCases } from '@/hooks/nurse/useIntraOpCases';
import { useRecoveryCases } from '@/hooks/nurse/useRecoveryCases';
import { WardPrepTableRow } from '@/components/nurse/WardPrepTableRow';
import { TheatreSupportTableRow } from '@/components/nurse/TheatreSupportTableRow';
import { RecoveryCaseTableRow } from '@/components/nurse/RecoveryCaseTableRow';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { PendingIntakesAlert } from '@/components/frontdesk/PendingIntakesAlert';
import { DashboardPipelineStats } from '@/components/frontdesk/DashboardPipelineStats';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import Link from 'next/link';

type Mode = 'desk' | 'clinical';
type QueueKey = 'ward' | 'intra' | 'post';

const QUEUES: Array<{
  key: QueueKey;
  title: string;
  href: string;
}> = [
  { key: 'ward', title: 'Ward Prep', href: '/nurse/ward-prep' },
  { key: 'intra', title: 'Intra-Op', href: '/nurse/intra-op' },
  { key: 'post', title: 'Post-Op', href: '/nurse/post-op' },
];

function MetricCard({
  title,
  subtitle,
  value,
  href,
  icon: Icon,
  loading,
}: {
  title: string;
  subtitle: string;
  value: number | string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  const router = useRouter();
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
      className="border border-slate-200 transition-colors cursor-pointer hover:bg-slate-50 hover:border-slate-300"
      onClick={() => router.push(href)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function NurseDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { openBookingDialog } = useBookAppointmentStore();
  const [mode, setMode] = useState<Mode>('clinical');
  const [activeQueue, setActiveQueue] = useState<QueueKey>('ward');
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState(false);

  const {
    data: wardPrepData,
    isLoading: loadingWardPrep,
    refetch: refetchWard,
    isRefetching: refetchingWard,
  } = usePreOpCases(
    { readiness: 'pending' },
    mode === 'clinical',
    { refetchInterval: mode === 'clinical' && activeQueue === 'ward' ? 60_000 : false },
  );
  const {
    data: intraOpData,
    isLoading: loadingIntraOp,
    refetch: refetchIntra,
    isRefetching: refetchingIntra,
  } = useIntraOpCases({
    enabled: mode === 'clinical',
    refetchInterval: mode === 'clinical' && activeQueue === 'intra' ? 60_000 : false,
  });
  const {
    data: recoveryData,
    isLoading: loadingRecovery,
    refetch: refetchPost,
    isRefetching: refetchingPost,
  } = useRecoveryCases({
    enabled: mode === 'clinical',
    refetchInterval: mode === 'clinical' && activeQueue === 'post' ? 60_000 : false,
  });

  const wardCases = useMemo(() => wardPrepData?.cases ?? [], [wardPrepData?.cases]);
  const intraCases = useMemo(() => intraOpData?.cases ?? [], [intraOpData?.cases]);
  const postCases = useMemo(() => recoveryData?.cases ?? [], [recoveryData?.cases]);

  const pendingWardCount = wardPrepData?.summary?.pending ?? wardCases.length;
  const intraCount = intraCases.length;
  const postCount = postCases.length;

  const isLoading =
    activeQueue === 'ward'
      ? loadingWardPrep
      : activeQueue === 'intra'
        ? loadingIntraOp
        : loadingRecovery;
  const isRefetching =
    activeQueue === 'ward'
      ? refetchingWard
      : activeQueue === 'intra'
        ? refetchingIntra
        : refetchingPost;

  const refetchActive = () => {
    if (activeQueue === 'ward') void refetchWard();
    else if (activeQueue === 'intra') void refetchIntra();
    else void refetchPost();
  };

  const activeMeta = QUEUES.find((q) => q.key === activeQueue)!;
  const activeCount =
    activeQueue === 'ward' ? pendingWardCount : activeQueue === 'intra' ? intraCount : postCount;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white/70">Please log in to access your dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nurse workspace</h1>
          <p className="text-sm text-white/70 mt-0.5">
            Front desk operations and clinical journey in one place.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/15 bg-white/10 p-1">
          {(
            [
              { key: 'desk', label: 'Front desk' },
              { key: 'clinical', label: 'Clinical' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                mode === tab.key ? 'bg-white text-[#2c2e4b]' : 'text-white/80 hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'desk' ? (
        <div className="space-y-5">
          <PendingIntakesAlert />
          <DashboardPipelineStats />

          <Card className="border border-[#e7d6bf]/60 bg-white shadow-sm">
            <CardContent className="p-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                onClick={() => setQuickAssignmentOpen(true)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add to queue
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  openBookingDialog({
                    source: AppointmentSource.FRONTDESK_SCHEDULED,
                    bookingChannel: BookingChannel.DASHBOARD,
                  })
                }
              >
                <CalendarIcon className="mr-1.5 h-4 w-4" />
                Book appointment
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/frontdesk/intake/start">
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Patient intake
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/nurse/patients">Patients</Link>
              </Button>
            </CardContent>
          </Card>

          <QueueManagementPanels role="NURSE" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              title="Surgical Cases"
              subtitle="Schedule & browse"
              value="→"
              href="/nurse/surgical-cases"
              icon={FolderKanban}
            />
            <MetricCard
              title="Ward Prep"
              subtitle="Pending checklists"
              value={pendingWardCount}
              href="/nurse/ward-prep"
              icon={ClipboardList}
              loading={loadingWardPrep}
            />
            <MetricCard
              title="Intra-Op"
              subtitle="Operation records"
              value={intraCount}
              href="/nurse/intra-op"
              icon={Activity}
              loading={loadingIntraOp}
            />
            <MetricCard
              title="Post-Op"
              subtitle="PACU records"
              value={postCount}
              href="/nurse/post-op"
              icon={HeartPulse}
              loading={loadingRecovery}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1 overflow-x-auto">
                {QUEUES.map((q) => {
                  const count =
                    q.key === 'ward' ? pendingWardCount : q.key === 'intra' ? intraCount : postCount;
                  return (
                    <button
                      key={q.key}
                      type="button"
                      onClick={() => setActiveQueue(q.key)}
                      className={cn(
                        'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        activeQueue === q.key
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      {q.title}
                      <span
                        className={cn(
                          'ml-1.5 tabular-nums',
                          activeQueue === q.key ? 'text-white/70' : 'text-slate-400',
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={refetchActive}
                  disabled={isRefetching}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefetching && 'animate-spin')} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <Link href={activeMeta.href}>View all</Link>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activeCount === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-slate-700">{activeMeta.title} queue is clear</p>
                <p className="text-xs text-slate-500 mt-1">No cases need attention in this stage.</p>
              </div>
            ) : activeQueue === 'ward' ? (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wardCases.map((c) => (
                    <WardPrepTableRow key={c.id} surgicalCase={c} />
                  ))}
                </TableBody>
              </Table>
            ) : activeQueue === 'intra' ? (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intraCases.map((c) => (
                    <TheatreSupportTableRow key={c.id} surgicalCase={c} />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postCases.map((c) => (
                    <RecoveryCaseTableRow key={c.id} surgicalCase={c} />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      <QuickAssignmentDialog
        open={quickAssignmentOpen}
        onOpenChange={setQuickAssignmentOpen}
        onSuccess={() => undefined}
      />
    </div>
  );
}
