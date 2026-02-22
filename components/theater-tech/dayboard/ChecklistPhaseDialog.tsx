/**
 * Component: ChecklistPhaseDialog
 *
 * Dialog for managing WHO checklist phases (draft save, finalize, read-only view).
 * Uses domain definitions for checklist items.
 */

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import {
  WHO_SIGN_IN_ITEMS,
  WHO_TIME_OUT_ITEMS,
  WHO_SIGN_OUT_ITEMS,
  type WhoChecklistItemDef,
} from '@/domain/clinical-forms/WhoSurgicalChecklist';
import {
  useChecklistStatus,
  useSaveChecklistDraft,
  useFinalizeChecklistPhase,
  type ChecklistItemPayload,
} from '@/hooks/theater-tech/useWhoChecklist';
import { extractMissingItems, isGateBlockedError } from '@/lib/theater-tech/dayboardHelpers';

interface ChecklistPhaseDialogProps {
  caseData: DayboardCaseDto;
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  onClose: () => void;
}

const PHASE_ITEMS: Record<'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT', readonly WhoChecklistItemDef[]> = {
  SIGN_IN: WHO_SIGN_IN_ITEMS,
  TIME_OUT: WHO_TIME_OUT_ITEMS,
  SIGN_OUT: WHO_SIGN_OUT_ITEMS,
};

export function ChecklistPhaseDialog({ caseData, phase, onClose }: ChecklistPhaseDialogProps) {
  const templateItems = PHASE_ITEMS[phase];
  const { data: checklistStatus, isLoading: loadingData } = useChecklistStatus(caseData.id);
  const saveDraftMutation = useSaveChecklistDraft();
  const finalizeMutation = useFinalizeChecklistPhase();

  // Phase status from dayboard data
  const phaseKey =
    phase === 'SIGN_IN'
      ? 'signInCompleted'
      : phase === 'TIME_OUT'
      ? 'timeOutCompleted'
      : 'signOutCompleted';
  const isFinalized = caseData.checklist[phaseKey as keyof typeof caseData.checklist] as boolean;

  // Get phase data from fetched checklist status
  const phaseData = checklistStatus
    ? phase === 'SIGN_IN'
      ? checklistStatus.signIn
      : phase === 'TIME_OUT'
      ? checklistStatus.timeOut
      : checklistStatus.signOut
    : null;

  const [confirmations, setConfirmations] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(templateItems.map((i) => [i.key, false]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Pre-fill confirmations from saved items when data loads
  useEffect(() => {
    if (phaseData?.items && Array.isArray(phaseData.items)) {
      const savedConfirmations: Record<string, boolean> = {};
      const savedNotes: Record<string, string> = {};
      for (const item of phaseData.items as ChecklistItemPayload[]) {
        savedConfirmations[item.key] = item.confirmed;
        if (item.note) savedNotes[item.key] = item.note;
      }
      setConfirmations((prev) => ({ ...prev, ...savedConfirmations }));
      setNotes((prev) => ({ ...prev, ...savedNotes }));
    }
  }, [phaseData]);

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

  const isPending = saveDraftMutation.isPending || finalizeMutation.isPending;
  const finalizeError = finalizeMutation.error as Error | null;
  const missingItems = finalizeError && isGateBlockedError(finalizeError) ? extractMissingItems(finalizeError) : [];

  const handleSaveDraft = () => {
    saveDraftMutation.mutate({
      caseId: caseData.id,
      phase,
      items: buildItems(),
    });
  };

  const handleFinalize = () => {
    finalizeMutation.mutate({
      caseId: caseData.id,
      phase,
      items: buildItems(),
    });
  };

  // Close dialog when finalize succeeds
  useEffect(() => {
    if (finalizeMutation.isSuccess) {
      onClose();
    }
  }, [finalizeMutation.isSuccess, onClose]);

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
                    const dateStr = typeof phaseData.completedAt === 'string' 
                      ? phaseData.completedAt 
                      : phaseData.completedAt instanceof Date
                      ? phaseData.completedAt.toISOString()
                      : String(phaseData.completedAt);
                    return format(parseISO(dateStr), 'MMM d, yyyy HH:mm');
                  } catch {
                    return String(phaseData.completedAt);
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
                onClick={handleSaveDraft}
              >
                {saveDraftMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FileText className="h-3.5 w-3.5 mr-1" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                disabled={!allConfirmed || isPending}
                onClick={handleFinalize}
              >
                {finalizeMutation.isPending ? (
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
