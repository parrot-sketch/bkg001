'use client';

/**
 * Theater Tech — Day-of-Operations Dayboard
 *
 * Production-grade surgical operations dashboard.
 * Displays cases booked for the selected date, grouped by theater.
 * Provides workflow controls for advancing case status through the surgical pipeline.
 *
 * Features:
 * - Date/theater/status filters
 * - Cases grouped by theater, ordered by start time
 * - Readiness blocker panel (red/yellow/green)
 * - Primary CTA changes by state
 * - Secondary actions: plan summary, nurse forms (read-only links)
 * - Optimistic UI updates with React Query
 * - Loading skeleton + empty state
 *
 * Data source: GET /api/theater-tech/dayboard
 */

import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Filter,
  Loader2,
  RefreshCw,
  Shield,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import { useDayboard } from '@/hooks/theater-tech/useDayboard';
import { useCaseTransition } from '@/hooks/theater-tech/useCaseTransition';
import {
  filterTheatersByStatus,
  getTheaterOptions,
} from '@/lib/theater-tech/dayboardHelpers';
import { DayboardCaseCard } from '@/components/theater-tech/dayboard/DayboardCaseCard';
import { TransitionDialog } from '@/components/theater-tech/dayboard/TransitionDialog';
import { ChecklistPhaseDialog } from '@/components/theater-tech/dayboard/ChecklistPhaseDialog';
import { BlockersDetailDialog } from '@/components/theater-tech/dayboard/BlockersDetailDialog';
import { TimelineDialog } from '@/components/theater-tech/dayboard/TimelineDialog';
import { InventoryPicklistDialog } from '@/components/theater-tech/dayboard/InventoryPicklistDialog';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PREP', label: 'In Prep' },
  { value: 'IN_THEATER', label: 'In Theater' },
  { value: 'RECOVERY', label: 'Recovery' },
  { value: 'COMPLETED', label: 'Completed' },
];

// ============================================================================
// SKELETON LOADER
// ============================================================================

function DayboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Summary strip skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>

      {/* Filter bar skeleton */}
      <Skeleton className="h-12 rounded-lg" />

      {/* Theater + Cases skeletons */}
      {[1, 2].map((t) => (
        <div key={t} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          {[1, 2, 3].map((c) => (
            <Skeleton key={c} className="h-32 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function TheaterTechDayboard() {
  // ── Filters ──
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedTheater, setSelectedTheater] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // ── Data ──
  const {
    data: dayboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDayboard(
    selectedDate,
    selectedTheater === 'ALL' ? undefined : selectedTheater
  );

  // ── Dialogs ──
  const [transitionDialog, setTransitionDialog] = useState<{
    caseData: DayboardCaseDto;
    action: string;
    label: string;
  } | null>(null);
  const [checklistDialog, setChecklistDialog] = useState<{
    caseData: DayboardCaseDto;
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT' | 'INVENTORY';
  } | null>(null);
  const [blockersDialog, setBlockersDialog] = useState<DayboardCaseDto | null>(null);
  const [timelineDialog, setTimelineDialog] = useState<DayboardCaseDto | null>(null);
  const [reason, setReason] = useState('');

  // ── Mutations ──
  const transitionMutation = useCaseTransition();

  // ── Filter cases by status ──
  const filteredTheaters = useMemo(() => {
    if (!dayboard) return [];
    return filterTheatersByStatus(dayboard.theaters, selectedStatus);
  }, [dayboard, selectedStatus]);

  // ── Unique theater names for filter ──
  const theaterOptions = useMemo(() => {
    if (!dayboard) return [];
    return getTheaterOptions(dayboard.theaters);
  }, [dayboard]);

  // ── Transition handler ──
  const handleTransition = () => {
    if (!transitionDialog) return;
    transitionMutation.mutate({
      caseId: transitionDialog.caseData.id,
      action: transitionDialog.action,
      reason: reason || undefined,
    });
  };

  // Close transition dialog when mutation succeeds
  useEffect(() => {
    if (transitionMutation.isSuccess && transitionDialog) {
      setTransitionDialog(null);
      setReason('');
      transitionMutation.reset();
    }
  }, [transitionMutation.isSuccess, transitionDialog, transitionMutation]);

  // ── Loading skeleton ──
  if (isLoading) {
    return <DayboardSkeleton />;
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="rounded-full bg-red-50 p-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">Failed to load operations board</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const summary = dayboard?.summary;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Operations Dayboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Summary Strip ── */}
        {summary && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'Total', value: summary.totalCases },
                { label: 'Scheduled', value: summary.scheduled },
                { label: 'In Prep', value: summary.inPrep },
                { label: 'In Theater', value: summary.inTheater },
                { label: 'Recovery', value: summary.inRecovery },
                { label: 'Done', value: summary.completed },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center"
                >
                  <p className="text-lg font-bold text-stone-900 leading-tight tabular-nums">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* ── OR Metrics Row ── */}
            {(summary.avgOrTimeMinutes !== null || summary.delayedStartCount > 0) && (
              <div className="flex items-center gap-3 flex-wrap">
                {summary.avgOrTimeMinutes !== null && (
                  <div className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5">
                    <Timer className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-xs font-medium text-stone-600">
                      Avg OR: {summary.avgOrTimeMinutes} min
                    </span>
                  </div>
                )}
                {summary.delayedStartCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-xs font-medium text-stone-600">
                      {summary.delayedStartCount} delayed start{summary.delayedStartCount !== 1 ? 's' : ''} (&gt;10 min)
                    </span>
                  </div>
                )}
                {Object.keys(summary.utilizationByTheater).length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5">
                    <Activity className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-xs text-stone-600">
                      Utilization:{' '}
                      {Object.entries(summary.utilizationByTheater)
                        .map(([, mins]) => `${mins}min`)
                        .join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-slate-200 px-4 py-3">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Date */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 w-[150px] text-xs"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Theater */}
          <Select value={selectedTheater} onValueChange={setSelectedTheater}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All Theaters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Theaters</SelectItem>
              {theaterOptions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Status */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick: Today */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
          >
            Today
          </Button>
        </div>

        {/* ── Theaters + Cases ── */}
        {filteredTheaters.map((theater) => (
          <div key={theater.id} className="space-y-2.5">
            {/* Theater Header */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className="h-3 w-3 rounded-full ring-2 ring-offset-1 ring-slate-300"
                style={{
                  backgroundColor: theater.colorCode || '#94a3b8',
                }}
              />
              <h2 className="text-sm font-semibold text-slate-800">{theater.name}</h2>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {theater.type}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {theater.cases.length} case{theater.cases.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cases */}
            <div className="space-y-2">
              {theater.cases.map((caseData) => (
                <DayboardCaseCard
                  key={caseData.id}
                  caseData={caseData}
                  onTransition={(action, label) =>
                    setTransitionDialog({ caseData, action, label })
                  }
                  onChecklist={(phase) =>
                    setChecklistDialog({ caseData, phase })
                  }
                  onViewBlockers={() => setBlockersDialog(caseData)}
                  onTimeline={() => setTimelineDialog(caseData)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Empty state ── */}
        {filteredTheaters.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
              <Shield className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">No cases found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedStatus !== 'ALL' || selectedTheater !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'No surgical cases scheduled for this date.'}
            </p>
          </div>
        )}

        {/* ── Transition Confirmation Dialog ── */}
        <TransitionDialog
          dialog={transitionDialog}
          reason={reason}
          setReason={setReason}
          onConfirm={handleTransition}
          onClose={() => {
            setTransitionDialog(null);
            setReason('');
            transitionMutation.reset();
          }}
          isPending={transitionMutation.isPending}
          error={transitionMutation.isError ? (transitionMutation.error as Error) : null}
        />

        {/* ── WHO Checklist Phase Dialog ── */}
        {checklistDialog && checklistDialog.phase !== 'INVENTORY' && (
          <ChecklistPhaseDialog
            caseData={checklistDialog.caseData}
            phase={checklistDialog.phase}
            onClose={() => setChecklistDialog(null)}
          />
        )}

        {/* ── Inventory Picklist Dialog ── */}
        {checklistDialog && checklistDialog.phase === 'INVENTORY' && (
          <InventoryPicklistDialog
            caseData={checklistDialog.caseData}
            onClose={() => setChecklistDialog(null)}
          />
        )}

        {/* ── Blockers Detail Dialog ── */}
        {blockersDialog && (
          <BlockersDetailDialog
            caseData={blockersDialog}
            onClose={() => setBlockersDialog(null)}
          />
        )}

        {/* ── Operative Timeline Dialog ── */}
        {timelineDialog && (
          <TimelineDialog
            caseData={timelineDialog}
            onClose={() => setTimelineDialog(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
