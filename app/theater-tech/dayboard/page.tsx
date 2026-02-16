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

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  FileText,
  Filter,
  Heart,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Stethoscope,
  Timer,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

import type {
  DayboardDto,
  DayboardCaseDto,
  DayboardBlockersDto,
  DayboardSummaryDto,
  ChecklistStatusDto,
  TimelineResultDto,
} from '@/application/dtos/TheaterTechDtos';
import {
  TIMELINE_FIELD_ORDER,
  TIMELINE_FIELD_LABELS,
  type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';

// ============================================================================
// API HELPERS
// ============================================================================

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

async function fetchDayboard(date: string, theaterId?: string): Promise<DayboardDto> {
  const token = getToken();
  const params = new URLSearchParams({ date });
  if (theaterId) params.set('theaterId', theaterId);
  const res = await fetch(`/api/theater-tech/dayboard?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch dayboard');
  return json.data;
}

interface TransitionErrorResponse {
  success: false;
  error: string;
  missingItems?: string[];
  blockingCategory?: string;
  message?: string;
}

async function transitionCase(
  caseId: string,
  action: string,
  reason?: string
): Promise<{ caseId: string; previousStatus: string; newStatus: string }> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/cases/${caseId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, reason }),
  });
  const json = await res.json();
  if (!json.success) {
    const err = new TransitionError(
      json.error || 'Transition failed',
      json.missingItems || [],
      json.blockingCategory || 'UNKNOWN'
    );
    throw err;
  }
  return json.data;
}

class TransitionError extends Error {
  constructor(
    message: string,
    public missingItems: string[],
    public blockingCategory: string
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

// ── WHO Checklist API helpers ──

interface ChecklistItemPayload {
  key: string;
  label: string;
  confirmed: boolean;
  note?: string;
}

async function fetchChecklistStatus(caseId: string): Promise<ChecklistStatusDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/checklist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch checklist');
  return json.data;
}

async function saveChecklistDraft(
  caseId: string,
  phase: string,
  items: ChecklistItemPayload[]
): Promise<ChecklistStatusDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/checklist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phase, items }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Draft save failed');
  return json.data;
}

class ChecklistFinalizeError extends Error {
  constructor(
    message: string,
    public missingItems: string[]
  ) {
    super(message);
    this.name = 'ChecklistFinalizeError';
  }
}

async function finalizeChecklistPhase(
  caseId: string,
  phase: string,
  items: ChecklistItemPayload[]
): Promise<ChecklistStatusDto> {
  const phasePath =
    phase === 'SIGN_IN' ? 'sign-in' : phase === 'TIME_OUT' ? 'time-out' : 'sign-out';
  const token = getToken();
  const res = await fetch(
    `/api/theater-tech/surgical-cases/${caseId}/checklist/${phasePath}/finalize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    }
  );
  const json = await res.json();
  if (!json.success) {
    throw new ChecklistFinalizeError(
      json.error || 'Finalization failed',
      json.metadata?.missingItems || []
    );
  }
  return json.data;
}

// ── Operative Timeline API helpers ──

async function fetchTimeline(caseId: string): Promise<TimelineResultDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch timeline');
  return json.data;
}

class TimelineUpdateError extends Error {
  constructor(
    message: string,
    public errors: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'TimelineUpdateError';
  }
}

async function updateTimeline(
  caseId: string,
  timestamps: Record<string, string>
): Promise<TimelineResultDto> {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(timestamps),
  });
  const json = await res.json();
  if (!json.success) {
    throw new TimelineUpdateError(
      json.error || 'Timeline update failed',
      json.metadata?.errors || []
    );
  }
  return json.data;
}

// Legacy: still used by old PATCH route (backward compat)
async function completeChecklistPhase(
  caseId: string,
  phase: string,
  items: ChecklistItemPayload[]
) {
  const token = getToken();
  const res = await fetch(`/api/theater-tech/cases/${caseId}/checklist`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phase, items }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Checklist update failed');
  return json.data;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Activity }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Clock,
  },
  IN_PREP: {
    label: 'In Prep',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Wrench,
  },
  IN_THEATER: {
    label: 'In Theater',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    icon: Activity,
  },
  RECOVERY: {
    label: 'Recovery',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Heart,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    icon: CheckCircle2,
  },
};

const NEXT_ACTION: Record<
  string,
  { action: string; label: string; icon: typeof Play; variant: 'default' | 'destructive' }
> = {
  SCHEDULED: { action: 'IN_PREP', label: 'Start Prep', icon: Wrench, variant: 'default' },
  IN_PREP: { action: 'IN_THEATER', label: 'Start Case', icon: Play, variant: 'default' },
  IN_THEATER: { action: 'RECOVERY', label: 'Move to Recovery', icon: Heart, variant: 'default' },
  RECOVERY: { action: 'COMPLETED', label: 'Complete', icon: CheckCircle2, variant: 'default' },
};

// WHO Surgical Safety Checklist canonical items (aligned with domain/clinical-forms/WhoSurgicalChecklist.ts)
const CHECKLIST_ITEMS: Record<string, { key: string; label: string; helpText?: string }[]> = {
  SIGN_IN: [
    { key: 'patient_identity', label: 'Patient identity confirmed (name, DOB, wristband)' },
    { key: 'site_marked', label: 'Surgical site marked / not applicable' },
    { key: 'consent_verified', label: 'Consent signed and verified' },
    { key: 'anesthesia_check', label: 'Anesthesia safety check completed' },
    { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning' },
    { key: 'allergy_check', label: 'Known allergies reviewed' },
    { key: 'airway_risk', label: 'Difficult airway / aspiration risk assessed', helpText: 'Equipment and assistance available if needed' },
    { key: 'blood_loss_risk', label: 'Risk of >500ml blood loss assessed', helpText: 'Adequate IV access and fluids planned' },
  ],
  TIME_OUT: [
    { key: 'team_intro', label: 'All team members introduced by name and role' },
    { key: 'patient_confirm', label: 'Patient name, procedure, and incision site confirmed' },
    { key: 'antibiotic_prophylaxis', label: 'Antibiotic prophylaxis given within last 60 minutes' },
    { key: 'critical_events_surgeon', label: 'Anticipated critical events — Surgeon reviewed', helpText: 'Critical steps, case duration, anticipated blood loss' },
    { key: 'critical_events_anesthesia', label: 'Anticipated critical events — Anesthesia reviewed', helpText: 'Patient-specific concerns' },
    { key: 'critical_events_nursing', label: 'Anticipated critical events — Nursing reviewed', helpText: 'Sterility confirmed, equipment issues, other concerns' },
    { key: 'imaging_displayed', label: 'Essential imaging displayed' },
    { key: 'equipment_sterile', label: 'Equipment sterility confirmed (indicator results)' },
  ],
  SIGN_OUT: [
    { key: 'procedure_recorded', label: 'Procedure name / description recorded' },
    { key: 'instrument_count', label: 'Instrument, sponge, and needle counts correct' },
    { key: 'specimen_labeled', label: 'Specimen labeled (including patient name)' },
    { key: 'equipment_issues', label: 'Equipment problems addressed' },
    { key: 'recovery_plan', label: 'Key concerns for recovery and management reviewed' },
  ],
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PREP', label: 'In Prep' },
  { value: 'IN_THEATER', label: 'In Theater' },
  { value: 'RECOVERY', label: 'Recovery' },
  { value: 'COMPLETED', label: 'Completed' },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function TheaterTechDayboard() {
  const queryClient = useQueryClient();

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
  } = useQuery<DayboardDto>({
    queryKey: ['theater-tech-dayboard', selectedDate, selectedTheater === 'ALL' ? '' : selectedTheater],
    queryFn: () =>
      fetchDayboard(
        selectedDate,
        selectedTheater === 'ALL' ? undefined : selectedTheater
      ),
    refetchInterval: 30_000,
    staleTime: 10_000,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  // ── Dialogs ──
  const [transitionDialog, setTransitionDialog] = useState<{
    caseData: DayboardCaseDto;
    action: string;
    label: string;
  } | null>(null);
  const [checklistDialog, setChecklistDialog] = useState<{
    caseData: DayboardCaseDto;
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  } | null>(null);
  const [blockersDialog, setBlockersDialog] = useState<DayboardCaseDto | null>(null);
  const [timelineDialog, setTimelineDialog] = useState<DayboardCaseDto | null>(null);
  const [reason, setReason] = useState('');

  // ── Transition mutation ──
  const transitionMutation = useMutation({
    mutationFn: (args: { caseId: string; action: string; reason?: string }) =>
      transitionCase(args.caseId, args.action, args.reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      toast.success(`Case transitioned to ${data.newStatus.replace(/_/g, ' ')}`, {
        description: transitionDialog?.caseData.patient.fullName,
      });
      setTransitionDialog(null);
      setReason('');
    },
    onError: (error: Error) => {
      if (error instanceof TransitionError && error.missingItems.length > 0) {
        toast.error('Transition blocked', {
          description: error.missingItems.slice(0, 3).join(', '),
        });
      } else {
        toast.error(error.message);
      }
    },
  });

  // ── Checklist draft save mutation ──
  const checklistDraftMutation = useMutation({
    mutationFn: (args: {
      caseId: string;
      phase: string;
      items: ChecklistItemPayload[];
    }) => saveChecklistDraft(args.caseId, args.phase, args.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      toast.success('Checklist draft saved');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Checklist finalize mutation ──
  const checklistFinalizeMutation = useMutation({
    mutationFn: (args: {
      caseId: string;
      phase: string;
      items: ChecklistItemPayload[];
    }) => finalizeChecklistPhase(args.caseId, args.phase, args.items),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-status'] });
      const phaseLabel =
        variables.phase === 'SIGN_IN'
          ? 'Sign-In'
          : variables.phase === 'TIME_OUT'
          ? 'Time-Out'
          : 'Sign-Out';
      toast.success(`WHO ${phaseLabel} finalized`, {
        description: checklistDialog?.caseData.patient.fullName,
      });
      setChecklistDialog(null);
    },
    onError: (err: Error) => {
      if (err instanceof ChecklistFinalizeError && err.missingItems.length > 0) {
        toast.error('Cannot finalize — incomplete items', {
          description: err.missingItems.slice(0, 4).join(', '),
        });
      } else {
        toast.error(err.message);
      }
    },
  });

  // ── Timeline mutation ──
  const timelineMutation = useMutation({
    mutationFn: (args: { caseId: string; timestamps: Record<string, string> }) =>
      updateTimeline(args.caseId, args.timestamps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-dayboard'] });
      toast.success('Timeline updated', {
        description: timelineDialog?.patient.fullName,
      });
    },
    onError: (err: Error) => {
      if (err instanceof TimelineUpdateError && err.errors.length > 0) {
        toast.error('Timeline validation failed', {
          description: err.errors.map((e) => e.message).join('; '),
        });
      } else {
        toast.error(err.message);
      }
    },
  });

  const handleTransition = useCallback(() => {
    if (!transitionDialog) return;
    transitionMutation.mutate({
      caseId: transitionDialog.caseData.id,
      action: transitionDialog.action,
      reason: reason || undefined,
    });
  }, [transitionDialog, reason, transitionMutation]);

  const handleChecklistDraft = useCallback(
    (items: ChecklistItemPayload[]) => {
      if (!checklistDialog) return;
      checklistDraftMutation.mutate({
        caseId: checklistDialog.caseData.id,
        phase: checklistDialog.phase,
        items,
      });
    },
    [checklistDialog, checklistDraftMutation]
  );

  const handleChecklistFinalize = useCallback(
    (items: ChecklistItemPayload[]) => {
      if (!checklistDialog) return;
      checklistFinalizeMutation.mutate({
        caseId: checklistDialog.caseData.id,
        phase: checklistDialog.phase,
        items,
      });
    },
    [checklistDialog, checklistFinalizeMutation]
  );

  // ── Filter cases by status ──
  const filteredTheaters = useMemo(() => {
    if (!dayboard) return [];
    if (selectedStatus === 'ALL') return dayboard.theaters;

    return dayboard.theaters
      .map((theater) => ({
        ...theater,
        cases: theater.cases.filter((c) => c.status === selectedStatus),
      }))
      .filter((t) => t.cases.length > 0);
  }, [dayboard, selectedStatus]);

  // ── Unique theater names for filter ──
  const theaterOptions = useMemo(() => {
    if (!dayboard) return [];
    return dayboard.theaters.map((t) => ({ value: t.id, label: t.name }));
  }, [dayboard]);

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
                { label: 'Total', value: summary.totalCases, color: 'bg-white border-slate-200' },
                { label: 'Scheduled', value: summary.scheduled, color: 'bg-blue-50/60 border-blue-200' },
                { label: 'In Prep', value: summary.inPrep, color: 'bg-amber-50/60 border-amber-200' },
                { label: 'In Theater', value: summary.inTheater, color: 'bg-violet-50/60 border-violet-200' },
                { label: 'Recovery', value: summary.inRecovery, color: 'bg-emerald-50/60 border-emerald-200' },
                { label: 'Done', value: summary.completed, color: 'bg-slate-50 border-slate-200' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-center transition-colors',
                    stat.color
                  )}
                >
                  <p className="text-lg font-bold text-slate-800 leading-tight">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* ── OR Metrics Row ── */}
            {(summary.avgOrTimeMinutes !== null || summary.delayedStartCount > 0) && (
              <div className="flex items-center gap-3 flex-wrap">
                {summary.avgOrTimeMinutes !== null && (
                  <div className="flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50/60 px-2.5 py-1.5">
                    <Timer className="h-3.5 w-3.5 text-cyan-600" />
                    <span className="text-xs font-semibold text-cyan-800">
                      Avg OR: {summary.avgOrTimeMinutes} min
                    </span>
                  </div>
                )}
                {summary.delayedStartCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">
                      {summary.delayedStartCount} delayed start{summary.delayedStartCount !== 1 ? 's' : ''} (&gt;10 min)
                    </span>
                  </div>
                )}
                {Object.keys(summary.utilizationByTheater).length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                    <Activity className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-xs text-slate-700">
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
                <CaseCard
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
        <TransitionConfirmDialog
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
          error={
            transitionMutation.isError
              ? transitionMutation.error
              : null
          }
        />

        {/* ── WHO Checklist Phase Dialog ── */}
        {checklistDialog && (
          <ChecklistPhaseDialog
            caseData={checklistDialog.caseData}
            phase={checklistDialog.phase}
            onClose={() => {
              setChecklistDialog(null);
              checklistDraftMutation.reset();
              checklistFinalizeMutation.reset();
            }}
            onSaveDraft={handleChecklistDraft}
            onFinalize={handleChecklistFinalize}
            isDraftPending={checklistDraftMutation.isPending}
            isFinalizePending={checklistFinalizeMutation.isPending}
            finalizeError={
              checklistFinalizeMutation.isError
                ? checklistFinalizeMutation.error
                : null
            }
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
            onClose={() => {
              setTimelineDialog(null);
              timelineMutation.reset();
            }}
            onUpdate={(timestamps) =>
              timelineMutation.mutate({
                caseId: timelineDialog.id,
                timestamps,
              })
            }
            isPending={timelineMutation.isPending}
            error={timelineMutation.isError ? timelineMutation.error : null}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// CASE CARD COMPONENT
// ============================================================================

function CaseCard({
  caseData,
  onTransition,
  onChecklist,
  onViewBlockers,
  onTimeline,
}: {
  caseData: DayboardCaseDto;
  onTransition: (action: string, label: string) => void;
  onChecklist: (phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT') => void;
  onViewBlockers: () => void;
  onTimeline: () => void;
}) {
  const statusCfg = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = statusCfg.icon;
  const nextAction = NEXT_ACTION[caseData.status];
  const blockers = caseData.blockers;

  const startTime = format(parseISO(caseData.booking.startTime), 'HH:mm');
  const endTime = format(parseISO(caseData.booking.endTime), 'HH:mm');

  return (
    <Card className="overflow-hidden hover:shadow-sm transition-shadow border-slate-200">
      <CardContent className="p-0">
        <div className="flex">
          {/* Left accent bar */}
          <div
            className={cn(
              'w-1 shrink-0',
              blockers.level === 'blocked'
                ? 'bg-red-500'
                : blockers.level === 'warning'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            )}
          />

          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Patient + Case Info */}
              <div className="flex-1 min-w-0">
                {/* Status + Urgency + Time */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-semibold px-2 py-0.5', statusCfg.bg, statusCfg.color)}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                  {caseData.urgency !== 'ELECTIVE' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {caseData.urgency}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {startTime} – {endTime}
                  </span>
                  {caseData.estimatedDurationMinutes && (
                    <span className="text-[10px] text-muted-foreground">
                      ({caseData.estimatedDurationMinutes}min)
                    </span>
                  )}
                </div>

                {/* Patient */}
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {caseData.patient.fullName}
                  </p>
                  {caseData.patient.fileNumber && (
                    <span className="text-[11px] text-muted-foreground">
                      #{caseData.patient.fileNumber}
                    </span>
                  )}
                  {caseData.patient.hasAllergies && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-red-300 text-red-600 bg-red-50"
                        >
                          ALLERGY
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Patient has documented allergies — check chart</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Procedure */}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {caseData.procedureName || 'Procedure TBD'}
                  {caseData.side && ` — ${caseData.side}`}
                </p>

                {/* Surgeon */}
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                  <Stethoscope className="h-3 w-3" />
                  <span>{caseData.primarySurgeon.name}</span>
                </div>
              </div>

              {/* Right: Actions + Checklist */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* WHO Checklist chips */}
                <div className="flex items-center gap-1">
                  {(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'] as const).map((phase) => {
                    const phaseKey =
                      phase === 'SIGN_IN'
                        ? 'signInCompleted'
                        : phase === 'TIME_OUT'
                        ? 'timeOutCompleted'
                        : 'signOutCompleted';
                    const completed = caseData.checklist[phaseKey as keyof typeof caseData.checklist];
                    const label = phase === 'SIGN_IN' ? 'SI' : phase === 'TIME_OUT' ? 'TO' : 'SO';

                    return (
                      <Tooltip key={phase}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onChecklist(phase)}
                            className={cn(
                              'h-7 px-2 rounded-md text-[10px] font-bold border transition-colors',
                              completed
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700'
                            )}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                            ) : (
                              <ClipboardCheck className="h-3 w-3 inline mr-0.5" />
                            )}
                            {label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {completed
                              ? `View ${phase.replace(/_/g, '-')} checklist`
                              : `Complete ${phase.replace(/_/g, '-')}`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Timeline button — visible for active cases */}
                {['IN_PREP', 'IN_THEATER', 'RECOVERY', 'COMPLETED'].includes(caseData.status) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onTimeline}
                        className={cn(
                          'h-7 px-2.5 rounded-md text-[10px] font-bold border transition-colors',
                          caseData.timeline &&
                            (caseData.timeline.wheelsIn || caseData.timeline.incisionTime)
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700'
                        )}
                      >
                        <Timer className="h-3 w-3 inline mr-0.5" />
                        Timeline
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Operative timeline timestamps</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Primary CTA */}
                {nextAction && (
                  <Button
                    size="sm"
                    className="text-xs h-8 min-w-[120px]"
                    onClick={() => onTransition(nextAction.action, nextAction.label)}
                  >
                    <nextAction.icon className="h-3 w-3 mr-1.5" />
                    {nextAction.label}
                  </Button>
                )}

                {caseData.status === 'COMPLETED' && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-slate-100 text-slate-600"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                    Done
                  </Badge>
                )}
              </div>
            </div>

            {/* ── Blockers Panel ── */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BlockerIndicator blockers={blockers} />
                  <BlockerChips blockers={blockers} status={caseData.status} timeline={caseData.timeline} />
                </div>
                <button
                  onClick={onViewBlockers}
                  className="text-[10px] text-muted-foreground hover:text-slate-600 transition-colors"
                >
                  Details →
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// BLOCKER COMPONENTS
// ============================================================================

function BlockerIndicator({ blockers }: { blockers: DayboardBlockersDto }) {
  const config = {
    clear: { color: 'bg-emerald-500', label: 'Ready' },
    warning: { color: 'bg-amber-400', label: 'Warning' },
    blocked: { color: 'bg-red-500', label: 'Blocked' },
  }[blockers.level];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider',
          blockers.level === 'clear'
            ? 'text-emerald-700'
            : blockers.level === 'warning'
            ? 'text-amber-700'
            : 'text-red-700'
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

function BlockerChips({
  blockers,
  status,
  timeline,
}: {
  blockers: DayboardBlockersDto;
  status: string;
  timeline: DayboardCaseDto['timeline'];
}) {
  const chips: { label: string; color: string }[] = [];

  if (status === 'IN_THEATER' || status === 'IN_PREP') {
    // Show intra-op status for in-theater cases
    if (blockers.nurseIntraOpStatus === 'FINAL') {
      chips.push({ label: 'Intra-Op ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.nurseIntraOpStatus === 'DRAFT') {
      chips.push({ label: 'Intra-Op Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    }
    if (blockers.intraOpDiscrepancy) {
      chips.push({ label: 'Count Discrepancy', color: 'bg-red-50 text-red-700 border-red-200' });
    }
  }

  // Nurse pre-op
  if (blockers.nursePreopStatus === 'FINAL') {
    chips.push({ label: 'Pre-Op ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  } else if (blockers.nursePreopStatus === 'DRAFT') {
    chips.push({ label: 'Pre-Op Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  } else {
    chips.push({ label: 'No Pre-Op', color: 'bg-slate-50 text-slate-500 border-slate-200' });
  }

  // Recovery
  if (status === 'RECOVERY' || status === 'COMPLETED') {
    if (blockers.nurseRecoveryStatus === 'FINAL' && blockers.dischargeReady) {
      chips.push({ label: 'Recovery ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.nurseRecoveryStatus === 'DRAFT') {
      chips.push({ label: 'Recovery Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    } else if (blockers.nurseRecoveryStatus === 'FINAL' && !blockers.dischargeReady) {
      chips.push({ label: 'Recovery Hold', color: 'bg-red-50 text-red-700 border-red-200' });
    } else if (!blockers.nurseRecoveryStatus) {
      chips.push({ label: 'No Recovery', color: 'bg-slate-50 text-slate-500 border-slate-200' });
    }
  }

  // Consents
  if (blockers.consentsTotalCount > 0) {
    const allSigned = blockers.consentsSignedCount === blockers.consentsTotalCount;
    chips.push({
      label: `Consents ${blockers.consentsSignedCount}/${blockers.consentsTotalCount}`,
      color: allSigned
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
    });
  }

  // Timeline soft warnings (Phase 6)
  if (status === 'IN_THEATER' && (!timeline?.incisionTime)) {
    chips.push({ label: 'No Incision Time', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  }
  if (status === 'RECOVERY' && (!timeline?.wheelsOut)) {
    chips.push({ label: 'No Wheels Out', color: 'bg-amber-50 text-amber-700 border-amber-200' });
  }

  // Doctor plan
  if (blockers.doctorPlanReady) {
    chips.push({ label: 'Plan ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  } else if (blockers.doctorPlanningMissingCount > 0) {
    chips.push({
      label: `Plan: ${blockers.doctorPlanningMissingCount} missing`,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    });
  }

  // Operative note (show for IN_THEATER, RECOVERY, COMPLETED)
  if (status === 'IN_THEATER' || status === 'RECOVERY' || status === 'COMPLETED') {
    if (blockers.operativeNoteStatus === 'FINAL') {
      chips.push({ label: 'Op Note ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    } else if (blockers.operativeNoteStatus === 'DRAFT') {
      chips.push({ label: 'Op Note Draft', color: 'bg-amber-50 text-amber-700 border-amber-200' });
    } else if (status === 'COMPLETED') {
      chips.push({ label: 'Op Note Missing', color: 'bg-red-50 text-red-700 border-red-200' });
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded border',
            chip.color
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// TRANSITION CONFIRMATION DIALOG
// ============================================================================

function TransitionConfirmDialog({
  dialog,
  reason,
  setReason,
  onConfirm,
  onClose,
  isPending,
  error,
}: {
  dialog: { caseData: DayboardCaseDto; action: string; label: string } | null;
  reason: string;
  setReason: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  error: Error | null;
}) {
  const isTransitionError = error instanceof TransitionError;
  const missingItems = isTransitionError ? (error as TransitionError).missingItems : [];

  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{dialog?.label}</DialogTitle>
          <DialogDescription className="text-xs">
            Advancing{' '}
            <span className="font-semibold">{dialog?.caseData.patient.fullName}</span> —{' '}
            {dialog?.caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Reason / Notes (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add any notes for the audit trail…"
            className="text-sm"
            rows={2}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-xs font-medium text-red-700">{error.message}</p>
            {missingItems.length > 0 && (
              <ul className="space-y-1">
                {missingItems.map((item, i) => (
                  <li key={i} className="text-[11px] text-red-600 flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// WHO CHECKLIST PHASE DIALOG (with draft save, finalize, read-only view)
// ============================================================================

function ChecklistPhaseDialog({
  caseData,
  phase,
  onClose,
  onSaveDraft,
  onFinalize,
  isDraftPending,
  isFinalizePending,
  finalizeError,
}: {
  caseData: DayboardCaseDto;
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  onClose: () => void;
  onSaveDraft: (items: ChecklistItemPayload[]) => void;
  onFinalize: (items: ChecklistItemPayload[]) => void;
  isDraftPending: boolean;
  isFinalizePending: boolean;
  finalizeError: Error | null;
}) {
  const templateItems = CHECKLIST_ITEMS[phase] || [];

  // Phase status from dayboard data
  const phaseKey =
    phase === 'SIGN_IN'
      ? 'signInCompleted'
      : phase === 'TIME_OUT'
      ? 'timeOutCompleted'
      : 'signOutCompleted';
  const isFinalized = caseData.checklist[phaseKey as keyof typeof caseData.checklist] as boolean;

  // Internal state for loading checklist data
  const [loadingData, setLoadingData] = useState(true);
  const [phaseData, setPhaseData] = useState<{
    completed: boolean;
    completedAt: string | null;
    completedByRole: string | null;
    items: ChecklistItemPayload[] | null;
  } | null>(null);

  const [confirmations, setConfirmations] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(templateItems.map((i) => [i.key, false]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Fetch existing checklist data on mount
  useState(() => {
    fetchChecklistStatus(caseData.id)
      .then((status) => {
        const sectionData =
          phase === 'SIGN_IN'
            ? status.signIn
            : phase === 'TIME_OUT'
            ? status.timeOut
            : status.signOut;
        setPhaseData(sectionData as typeof phaseData);

        // Pre-fill confirmations from saved items
        if (sectionData?.items && Array.isArray(sectionData.items)) {
          const savedConfirmations: Record<string, boolean> = {};
          const savedNotes: Record<string, string> = {};
          for (const item of sectionData.items as ChecklistItemPayload[]) {
            savedConfirmations[item.key] = item.confirmed;
            if (item.note) savedNotes[item.key] = item.note;
          }
          setConfirmations((prev) => ({ ...prev, ...savedConfirmations }));
          setNotes((prev) => ({ ...prev, ...savedNotes }));
        }
      })
      .catch(() => {
        // If fetch fails, continue with blank form
      })
      .finally(() => setLoadingData(false));
  });

  const allConfirmed = templateItems.every((i) => confirmations[i.key]);
  const confirmedCount = templateItems.filter((i) => confirmations[i.key]).length;

  const phaseLabel =
    phase === 'SIGN_IN' ? 'Sign-In' : phase === 'TIME_OUT' ? 'Time-Out' : 'Sign-Out';

  const buildItems = (): ChecklistItemPayload[] =>
    templateItems.map((i) => ({
      key: i.key,
      label: i.label,
      confirmed: confirmations[i.key],
      note: notes[i.key] || undefined,
    }));

  const isPending = isDraftPending || isFinalizePending;

  // Extract missing items from finalize error
  const missingItems =
    finalizeError instanceof ChecklistFinalizeError ? finalizeError.missingItems : [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-600" />
            WHO {phaseLabel} Checklist
            {isFinalized && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100 text-emerald-700">
                Finalized
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
            <span className="ml-2 text-muted-foreground">
              ({confirmedCount}/{templateItems.length})
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Finalized info banner */}
        {isFinalized && phaseData?.completedAt && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-800">
              <p className="font-medium">
                Finalized{' '}
                {(() => {
                  try {
                    return format(parseISO(phaseData.completedAt), 'MMM d, yyyy HH:mm');
                  } catch {
                    return phaseData.completedAt;
                  }
                })()}
              </p>
              {phaseData.completedByRole && (
                <p className="text-emerald-600">by {phaseData.completedByRole.replace(/_/g, ' ')}</p>
              )}
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="space-y-2.5 py-4">
            {templateItems.map((item) => (
              <Skeleton key={item.key} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 py-2">
            {templateItems.map((item) => (
              <label
                key={item.key}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-all',
                  isFinalized ? 'cursor-default' : 'cursor-pointer',
                  confirmations[item.key]
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-slate-200',
                  !isFinalized && !confirmations[item.key] && 'hover:bg-slate-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={confirmations[item.key]}
                  disabled={isFinalized}
                  onChange={(e) =>
                    setConfirmations((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-60"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  {item.helpText && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.helpText}</p>
                  )}
                  {!isFinalized && (
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={notes[item.key] || ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.key]: e.target.value }))
                      }
                      className="mt-1 w-full text-xs border-0 border-b border-transparent focus:border-slate-300 bg-transparent p-0 focus:ring-0 text-muted-foreground"
                    />
                  )}
                  {isFinalized && notes[item.key] && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{notes[item.key]}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Missing items from finalize error */}
        {missingItems.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-medium text-red-700 mb-1.5">
              Cannot finalize — the following items are required:
            </p>
            <ul className="space-y-1">
              {missingItems.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General error */}
        {finalizeError && missingItems.length === 0 && (
          <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">{finalizeError.message}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            {isFinalized ? 'Close' : 'Cancel'}
          </Button>
          {!isFinalized && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => onSaveDraft(buildItems())}
              >
                {isDraftPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FileText className="h-3.5 w-3.5 mr-1" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                disabled={!allConfirmed || isPending}
                onClick={() => onFinalize(buildItems())}
              >
                {isFinalizePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Finalize {phaseLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// BLOCKERS DETAIL DIALOG
// ============================================================================

function BlockersDetailDialog({
  caseData,
  onClose,
}: {
  caseData: DayboardCaseDto;
  onClose: () => void;
}) {
  const b = caseData.blockers;

  const items: { label: string; status: 'ok' | 'warn' | 'error' | 'info' }[] = [
    {
      label: b.doctorPlanReady
        ? 'Doctor planning complete'
        : `Doctor planning: ${b.doctorPlanningMissingCount} item(s) missing`,
      status: b.doctorPlanReady ? 'ok' : b.doctorPlanningMissingCount > 2 ? 'error' : 'warn',
    },
    {
      label:
        b.nursePreopStatus === 'FINAL'
          ? 'Nurse pre-op checklist finalized'
          : b.nursePreopStatus === 'DRAFT'
          ? 'Nurse pre-op checklist in draft'
          : 'Nurse pre-op checklist not started',
      status: b.nursePreopStatus === 'FINAL' ? 'ok' : b.nursePreopStatus === 'DRAFT' ? 'warn' : 'error',
    },
    {
      label:
        b.consentsTotalCount === 0
          ? 'No consents created'
          : `Consents signed: ${b.consentsSignedCount} of ${b.consentsTotalCount}`,
      status:
        b.consentsTotalCount === 0
          ? 'error'
          : b.consentsSignedCount === b.consentsTotalCount
          ? 'ok'
          : 'warn',
    },
    {
      label: `Pre-op photos: ${b.preOpPhotosCount}`,
      status: b.preOpPhotosCount > 0 ? 'ok' : 'warn',
    },
    {
      label:
        b.nurseIntraOpStatus === 'FINAL'
          ? 'Intra-op record finalized'
          : b.nurseIntraOpStatus === 'DRAFT'
          ? 'Intra-op record in draft'
          : 'Intra-op record not started',
      status:
        b.nurseIntraOpStatus === 'FINAL'
          ? 'ok'
          : b.nurseIntraOpStatus === 'DRAFT'
          ? 'info'
          : 'info',
    },
  ];

  if (b.intraOpDiscrepancy) {
    items.push({
      label: 'Count discrepancy flagged in intra-op record',
      status: 'error',
    });
  }

  // Recovery record
  items.push({
    label:
      b.nurseRecoveryStatus === 'FINAL'
        ? 'Recovery record finalized'
        : b.nurseRecoveryStatus === 'DRAFT'
        ? 'Recovery record in draft'
        : 'Recovery record not started',
    status:
      b.nurseRecoveryStatus === 'FINAL'
        ? 'ok'
        : b.nurseRecoveryStatus === 'DRAFT'
        ? 'warn'
        : caseData.status === 'RECOVERY' || caseData.status === 'COMPLETED'
        ? 'error'
        : 'info',
  });

  if (b.nurseRecoveryStatus === 'FINAL' && !b.dischargeReady) {
    items.push({
      label: 'Recovery: Discharge criteria not met or decision is HOLD',
      status: 'error',
    });
  }

  // Checklist
  items.push(
    {
      label: caseData.checklist.signInCompleted ? 'WHO Sign-In complete' : 'WHO Sign-In pending',
      status: caseData.checklist.signInCompleted ? 'ok' : 'info',
    },
    {
      label: caseData.checklist.timeOutCompleted ? 'WHO Time-Out complete' : 'WHO Time-Out pending',
      status: caseData.checklist.timeOutCompleted ? 'ok' : 'info',
    },
    {
      label: caseData.checklist.signOutCompleted ? 'WHO Sign-Out complete' : 'WHO Sign-Out pending',
      status: caseData.checklist.signOutCompleted ? 'ok' : 'info',
    }
  );

  const statusIcon = {
    ok: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    info: <Clock className="h-3.5 w-3.5 text-slate-400" />,
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Case Readiness</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                item.status === 'ok'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : item.status === 'warn'
                  ? 'bg-amber-50/50 border-amber-200'
                  : item.status === 'error'
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-slate-50/50 border-slate-200'
              )}
            >
              {statusIcon[item.status]}
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// OPERATIVE TIMELINE DIALOG
// ============================================================================

function TimelineDialog({
  caseData,
  onClose,
  onUpdate,
  isPending,
  error,
}: {
  caseData: DayboardCaseDto;
  onClose: () => void;
  onUpdate: (timestamps: Record<string, string>) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<TimelineResultDto | null>(null);
  const [localTimes, setLocalTimes] = useState<Record<string, string>>({});

  const isReadOnly = caseData.status === 'COMPLETED';

  // Fetch timeline data on mount
  useState(() => {
    fetchTimeline(caseData.id)
      .then((data) => {
        setTimelineData(data);
        // Pre-fill local times from existing timeline (convert ISO to datetime-local)
        const existing: Record<string, string> = {};
        for (const field of TIMELINE_FIELD_ORDER) {
          const val = data.timeline[field];
          if (val) {
            existing[field] = toDatetimeLocal(val);
          }
        }
        setLocalTimes(existing);
      })
      .catch(() => {
        // If fetch fails, continue with empty timeline
      })
      .finally(() => setLoading(false));
  });

  const handleSetNow = (field: TimelineFieldName) => {
    const now = new Date();
    setLocalTimes((prev) => ({
      ...prev,
      [field]: toDatetimeLocal(now.toISOString()),
    }));
    // Immediately save this single timestamp
    onUpdate({ [field]: now.toISOString() });
  };

  const handleSaveField = (field: TimelineFieldName) => {
    const localVal = localTimes[field];
    if (!localVal) return;
    const isoVal = new Date(localVal).toISOString();
    onUpdate({ [field]: isoVal });
  };

  const validationErrors =
    error instanceof TimelineUpdateError ? error.errors : [];

  // Compute durations from current timeline data
  const durations = timelineData?.durations;
  const missingItems = timelineData?.missingItems ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-600" />
            Operative Timeline
            {isReadOnly && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-slate-100 text-slate-600">
                View Only
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {TIMELINE_FIELD_ORDER.map((f) => (
              <Skeleton key={f} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Timeline fields */}
            <div className="space-y-2.5 py-2">
              {TIMELINE_FIELD_ORDER.map((field) => {
                const label = TIMELINE_FIELD_LABELS[field];
                const currentValue = timelineData?.timeline[field];
                const localValue = localTimes[field] || '';
                const fieldError = validationErrors.find((e) => e.field === field);

                return (
                  <div
                    key={field}
                    className={cn(
                      'rounded-lg border p-3 transition-all',
                      currentValue
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200',
                      fieldError && 'border-red-300 bg-red-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {currentValue ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-slate-800">{label}</span>
                      </div>

                      {!isReadOnly && !currentValue && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 text-cyan-700 border-cyan-300 bg-cyan-50 hover:bg-cyan-100"
                          disabled={isPending}
                          onClick={() => handleSetNow(field)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Set Now
                        </Button>
                      )}
                    </div>

                    <div className="mt-2">
                      {isReadOnly ? (
                        <p className="text-xs text-muted-foreground">
                          {currentValue
                            ? formatTimelineValue(currentValue)
                            : 'Not recorded'}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={localValue}
                            onChange={(e) =>
                              setLocalTimes((prev) => ({
                                ...prev,
                                [field]: e.target.value,
                              }))
                            }
                            className="flex-1 h-8 text-xs rounded-md border border-slate-200 px-2 bg-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                          {localValue && localValue !== toDatetimeLocal(currentValue || '') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2"
                              disabled={isPending}
                              onClick={() => handleSaveField(field)}
                            >
                              {isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {fieldError && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3 shrink-0" />
                        {fieldError.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Derived durations */}
            {durations && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Derived Durations
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'OR Time', value: durations.orTimeMinutes, unit: 'min' },
                    { label: 'Surgery Time', value: durations.surgeryTimeMinutes, unit: 'min' },
                    { label: 'Prep Time', value: durations.prepTimeMinutes, unit: 'min' },
                    { label: 'Close-out Time', value: durations.closeOutTimeMinutes, unit: 'min' },
                    { label: 'Anesthesia Time', value: durations.anesthesiaTimeMinutes, unit: 'min' },
                  ].map((d) => (
                    <div key={d.label} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground">{d.label}:</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {d.value !== null ? `${d.value} ${d.unit}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing items soft warnings */}
            {missingItems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
                  Missing for current status ({caseData.status.replace(/_/g, ' ')})
                </p>
                <div className="space-y-1">
                  {missingItems.map((item) => (
                    <div
                      key={item.field}
                      className="flex items-center gap-1.5 text-xs text-amber-700"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General error */}
            {error && validationErrors.length === 0 && (
              <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">{error.message}</p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Convert ISO string to datetime-local input value */
function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/** Format timeline value for read-only display */
function formatTimelineValue(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return iso;
  }
}

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
