'use client';

/**
 * Theater Tech — Day-of-Operations Board
 *
 * Displays today's surgical cases grouped by theater.
 * Provides controls for:
 * - Advancing case status (SCHEDULED → IN_PREP → IN_THEATER → RECOVERY → COMPLETED)
 * - Completing WHO surgical safety checklist phases (Sign-In / Time-Out / Sign-Out)
 * - Recording intra-operative timestamps
 *
 * Data source: GET /api/theater-tech/today
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Timer,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import type {
  TheaterBoardDto,
  TheaterCaseDto,
  ChecklistStatusDto,
} from '@/application/dtos/TheaterTechDtos';

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchTodayBoard(): Promise<TheaterBoardDto> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/theater-tech/today', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch board');
  return json.data;
}

async function transitionCase(caseId: string, action: string, reason?: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/theater-tech/cases/${caseId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, reason }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Transition failed');
  return json.data;
}

async function fetchChecklist(caseId: string): Promise<ChecklistStatusDto> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/theater-tech/cases/${caseId}/checklist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch checklist');
  return json.data;
}

async function completeChecklistPhase(
  caseId: string,
  phase: string,
  items: { key: string; label: string; confirmed: boolean; note?: string }[]
) {
  const token = localStorage.getItem('accessToken');
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

async function updateTimestamps(
  caseId: string,
  timestamps: Record<string, string>
) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(
    `/api/theater-tech/cases/${caseId}/procedure-record/timestamps`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(timestamps),
    }
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Timestamp update failed');
  return json.data;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  IN_PREP: { label: 'In Prep', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Wrench },
  IN_THEATER: { label: 'In Theater', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: Activity },
  RECOVERY: { label: 'Recovery', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Timer },
  COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 },
};

const NEXT_ACTION: Record<string, { action: string; label: string }> = {
  SCHEDULED: { action: 'IN_PREP', label: 'Start Prep' },
  IN_PREP: { action: 'IN_THEATER', label: 'Move to Theater' },
  IN_THEATER: { action: 'RECOVERY', label: 'Move to Recovery' },
  RECOVERY: { action: 'COMPLETED', label: 'Mark Complete' },
};

// WHO Surgical Safety Checklist items per phase
const CHECKLIST_ITEMS: Record<string, { key: string; label: string }[]> = {
  SIGN_IN: [
    { key: 'patient_identity', label: 'Patient identity confirmed' },
    { key: 'site_marked', label: 'Site marked / not applicable' },
    { key: 'consent_signed', label: 'Consent signed' },
    { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning' },
    { key: 'allergy_check', label: 'Known allergies reviewed' },
    { key: 'airway_risk', label: 'Difficult airway / aspiration risk assessed' },
    { key: 'blood_loss_risk', label: 'Risk of blood loss >500ml assessed' },
  ],
  TIME_OUT: [
    { key: 'team_intro', label: 'All team members introduced by name and role' },
    { key: 'patient_confirm', label: 'Patient name, procedure, and site confirmed' },
    { key: 'antibiotic_given', label: 'Antibiotic prophylaxis given (if applicable)' },
    { key: 'imaging_displayed', label: 'Essential imaging displayed (if applicable)' },
    { key: 'critical_steps', label: 'Critical or unexpected steps discussed' },
    { key: 'equipment_sterile', label: 'Equipment sterility confirmed' },
  ],
  SIGN_OUT: [
    { key: 'procedure_recorded', label: 'Procedure name recorded' },
    { key: 'instrument_count', label: 'Instrument, sponge, and needle counts complete' },
    { key: 'specimen_labeled', label: 'Specimen labeled (if applicable)' },
    { key: 'equipment_issues', label: 'Equipment problems addressed' },
    { key: 'recovery_concerns', label: 'Key concerns for recovery communicated' },
  ],
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function TheaterTechDashboard() {
  const queryClient = useQueryClient();

  // Board data
  const {
    data: board,
    isLoading,
    error,
    refetch,
  } = useQuery<TheaterBoardDto>({
    queryKey: ['theater-tech-board'],
    queryFn: fetchTodayBoard,
    refetchInterval: 30_000, // Auto-refresh every 30s
  });

  // State for dialogs
  const [transitionDialog, setTransitionDialog] = useState<{
    caseData: TheaterCaseDto;
    action: string;
    label: string;
  } | null>(null);
  const [checklistDialog, setChecklistDialog] = useState<{
    caseData: TheaterCaseDto;
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  } | null>(null);
  const [reason, setReason] = useState('');

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: (args: { caseId: string; action: string; reason?: string }) =>
      transitionCase(args.caseId, args.action, args.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-board'] });
      setTransitionDialog(null);
      setReason('');
    },
  });

  // Checklist mutation
  const checklistMutation = useMutation({
    mutationFn: (args: {
      caseId: string;
      phase: string;
      items: { key: string; label: string; confirmed: boolean; note?: string }[];
    }) => completeChecklistPhase(args.caseId, args.phase, args.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-board'] });
      setChecklistDialog(null);
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

  const handleChecklistComplete = useCallback(
    (items: { key: string; label: string; confirmed: boolean; note?: string }[]) => {
      if (!checklistDialog) return;
      checklistMutation.mutate({
        caseId: checklistDialog.caseData.id,
        phase: checklistDialog.phase,
        items,
      });
    },
    [checklistDialog, checklistMutation]
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        <span className="ml-3 text-sm text-muted-foreground">Loading operations board…</span>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{(error as Error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const summary = board?.summary;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Day-of Operations Board
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── Summary Strip ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Cases', value: summary.totalCases, color: 'bg-slate-50 border-slate-200' },
            { label: 'Scheduled', value: summary.scheduled, color: 'bg-blue-50 border-blue-200' },
            { label: 'In Prep', value: summary.inPrep, color: 'bg-amber-50 border-amber-200' },
            { label: 'In Theater', value: summary.inTheater, color: 'bg-violet-50 border-violet-200' },
            { label: 'Recovery', value: summary.inRecovery, color: 'bg-emerald-50 border-emerald-200' },
            { label: 'Completed', value: summary.completed, color: 'bg-slate-50 border-slate-200' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('rounded-lg border px-3 py-2.5 text-center', stat.color)}
            >
              <p className="text-lg font-bold text-slate-800">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Theaters ── */}
      {board?.theaters.map((theater) => (
        <div key={theater.id} className="space-y-3">
          {/* Theater Header */}
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: theater.colorCode || '#94a3b8' }}
            />
            <h2 className="text-sm font-semibold text-slate-800">{theater.name}</h2>
            <Badge variant="secondary" className="text-[10px]">
              {theater.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {theater.cases.length} case{theater.cases.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cases */}
          {theater.cases.length === 0 ? (
            <p className="text-xs text-muted-foreground ml-5 italic">
              No cases scheduled in this theater today.
            </p>
          ) : (
            <div className="space-y-2">
              {theater.cases.map((caseData) => {
                const statusCfg = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.SCHEDULED;
                const StatusIcon = statusCfg.icon;
                const nextAction = NEXT_ACTION[caseData.status];

                return (
                  <div
                    key={caseData.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Patient + Procedure */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] font-semibold', statusCfg.color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                          {caseData.urgency !== 'ELECTIVE' && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {caseData.urgency}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {caseData.patient.fullName}
                          {caseData.patient.fileNumber && (
                            <span className="text-muted-foreground font-normal ml-1.5">
                              #{caseData.patient.fileNumber}
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {caseData.procedureName || 'Procedure TBD'}
                          {caseData.side && ` — ${caseData.side}`}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {caseData.primarySurgeon.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(caseData.booking.startTime), 'HH:mm')} –{' '}
                            {format(new Date(caseData.booking.endTime), 'HH:mm')}
                          </span>
                        </div>
                      </div>

                      {/* Right: Checklist chips + Action */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Checklist chips */}
                        <div className="flex items-center gap-1">
                          {(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'] as const).map((phase) => {
                            const phaseKey = phase === 'SIGN_IN'
                              ? 'signInCompleted'
                              : phase === 'TIME_OUT'
                              ? 'timeOutCompleted'
                              : 'signOutCompleted';
                            const completed = caseData.checklist[phaseKey];
                            const label = phase === 'SIGN_IN'
                              ? 'SI'
                              : phase === 'TIME_OUT'
                              ? 'TO'
                              : 'SO';

                            return (
                              <button
                                key={phase}
                                onClick={() =>
                                  !completed &&
                                  setChecklistDialog({ caseData, phase })
                                }
                                disabled={completed}
                                className={cn(
                                  'h-7 px-2 rounded-md text-[10px] font-bold border transition-colors',
                                  completed
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700'
                                )}
                                title={
                                  completed
                                    ? `${phase.replace('_', '-')} completed`
                                    : `Complete ${phase.replace('_', '-')}`
                                }
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                                ) : (
                                  <ClipboardCheck className="h-3 w-3 inline mr-0.5" />
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Next action button */}
                        {nextAction && (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-8"
                            onClick={() =>
                              setTransitionDialog({
                                caseData,
                                action: nextAction.action,
                                label: nextAction.label,
                              })
                            }
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {nextAction.label}
                          </Button>
                        )}

                        {caseData.status === 'COMPLETED' && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-slate-100"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Readiness bar (visible for SCHEDULED / IN_PREP) */}
                    {(caseData.status === 'SCHEDULED' || caseData.status === 'IN_PREP') && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Pre-op Readiness</span>
                          <span className="font-semibold">
                            {caseData.readinessPercentage}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              caseData.readinessPercentage === 100
                                ? 'bg-emerald-500'
                                : caseData.readinessPercentage >= 80
                                ? 'bg-cyan-500'
                                : 'bg-amber-500'
                            )}
                            style={{ width: `${caseData.readinessPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {board?.theaters.every((t) => t.cases.length === 0) && (
        <div className="text-center py-16">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cases scheduled for today.</p>
        </div>
      )}

      {/* ── Transition Confirmation Dialog ── */}
      <Dialog
        open={!!transitionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setTransitionDialog(null);
            setReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {transitionDialog?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Advancing{' '}
              <span className="font-semibold">
                {transitionDialog?.caseData.patient.fullName}
              </span>{' '}
              — {transitionDialog?.caseData.procedureName || 'Procedure'}
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
              rows={3}
            />
          </div>

          {transitionMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">
              {(transitionMutation.error as Error).message}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransitionDialog(null);
                setReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransition}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Checklist Phase Dialog ── */}
      {checklistDialog && (
        <ChecklistPhaseDialog
          caseData={checklistDialog.caseData}
          phase={checklistDialog.phase}
          onClose={() => setChecklistDialog(null)}
          onComplete={handleChecklistComplete}
          isPending={checklistMutation.isPending}
          error={checklistMutation.isError ? (checklistMutation.error as Error).message : null}
        />
      )}
    </div>
  );
}

// ============================================================================
// CHECKLIST PHASE DIALOG
// ============================================================================

function ChecklistPhaseDialog({
  caseData,
  phase,
  onClose,
  onComplete,
  isPending,
  error,
}: {
  caseData: TheaterCaseDto;
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  onClose: () => void;
  onComplete: (items: { key: string; label: string; confirmed: boolean; note?: string }[]) => void;
  isPending: boolean;
  error: string | null;
}) {
  const templateItems = CHECKLIST_ITEMS[phase] || [];
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>(
    () => Object.fromEntries(templateItems.map((i) => [i.key, false]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  const allConfirmed = templateItems.every((i) => confirmations[i.key]);

  const phaseLabel =
    phase === 'SIGN_IN' ? 'Sign-In' : phase === 'TIME_OUT' ? 'Time-Out' : 'Sign-Out';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-600" />
            WHO {phaseLabel} Checklist
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {templateItems.map((item) => (
            <label
              key={item.key}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                confirmations[item.key]
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              )}
            >
              <input
                type="checkbox"
                checked={confirmations[item.key]}
                onChange={(e) =>
                  setConfirmations((prev) => ({
                    ...prev,
                    [item.key]: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={notes[item.key] || ''}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [item.key]: e.target.value }))
                  }
                  className="mt-1 w-full text-xs border-0 border-b border-transparent focus:border-slate-300 bg-transparent p-0 focus:ring-0 text-muted-foreground"
                />
              </div>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!allConfirmed || isPending}
            onClick={() => {
              const items = templateItems.map((i) => ({
                key: i.key,
                label: i.label,
                confirmed: confirmations[i.key],
                note: notes[i.key] || undefined,
              }));
              onComplete(items);
            }}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            )}
            Complete {phaseLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
