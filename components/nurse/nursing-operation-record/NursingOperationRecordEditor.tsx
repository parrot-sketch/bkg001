'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import {
  useIntraOpRecord,
  useSaveIntraOpRecord,
  useFinalizeIntraOpRecord,
  IntraOpFinalizeValidationError,
} from '@/hooks/nurse/useIntraOpRecord';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import {
  createEmptyIntraOpDraft,
  getIntraOpSectionCompletion,
  NOR_FIELD_GROUPS,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Printer,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Page1PreOpSection } from './sections/Page1PreOpSection';
import { Page2IntraOpSection } from './sections/Page2IntraOpSection';
import { IntraOpReviewPanel } from './components/IntraOpReviewPanel';
import { IntraOpMissingItemsDialog } from './components/IntraOpMissingItemsDialog';

interface Props {
  caseId: string;
}

const NAV_CHIPS = NOR_FIELD_GROUPS.filter((g) => !('optional' in g && g.optional));

function computeFinalizeReadiness(data: NurseIntraOpRecordDraft) {
  const checks = [
    !!data.patientFileNo?.trim(),
    !!data.patientName?.trim(),
    !!data.date?.trim(),
    !!data.doctor?.trim(),
    data.patientIdVerified === 'Y' || data.patientIdVerified === 'N',
    data.informedConsentSigned === 'Y' || data.informedConsentSigned === 'N',
    data.preOpChecklistCompleted === 'Y' || data.preOpChecklistCompleted === 'N',
    data.whoChecklistCompleted === 'Y' || data.whoChecklistCompleted === 'N',
    data.arrivedWithIVInfusing === 'Y' || data.arrivedWithIVInfusing === 'N',
    data.countCorrect === 'Y' || data.countCorrect === 'N',
    !!data.scrubNurse?.trim(),
    !!data.circulatingNurse?.trim(),
    data.whoChecklistCompleted === 'Y',
    data.countCorrect === 'Y',
    data.countCorrect !== 'N' || !!data.countActionTaken?.trim(),
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

export function NursingOperationRecordEditor({ caseId }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { data, isLoading, error } = useIntraOpRecord(caseId);
  const saveMutation = useSaveIntraOpRecord(caseId);
  const finalizeMutation = useFinalizeIntraOpRecord(caseId);

  const [formData, setFormData] = useState<NurseIntraOpRecordDraft>(createEmptyIntraOpDraft());
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [showMissingItems, setShowMissingItems] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(NAV_CHIPS[0]?.id ?? 'nor-patient');

  const formDataRef = useRef(formData);
  const isDirtyRef = useRef(isDirty);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSaveRef = useRef(false);

  formDataRef.current = formData;
  isDirtyRef.current = isDirty;

  const isFinal = data?.form?.status === 'FINAL';
  const isDisabled = !isAuthenticated || !!isFinal;
  const canEdit = useMemo(() => user?.role === 'NURSE', [user?.role]);

  const persistDraft = useCallback(
    async (opts?: { silent?: boolean; data?: NurseIntraOpRecordDraft }) => {
      if (!canEdit || isFinal) return;
      const payload = opts?.data ?? formDataRef.current;
      await saveMutation.mutateAsync({ data: payload, silent: opts?.silent ?? false });
      // Only clear dirty if nothing new was typed while the request was in flight
      if (JSON.stringify(formDataRef.current) === JSON.stringify(payload)) {
        setIsDirty(false);
      }
      setLastSavedAt(new Date());
    },
    [canEdit, isFinal, saveMutation],
  );

  // Debounced auto-save
  useEffect(() => {
    if (!canEdit || isFinal || !isDirty) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraft({ silent: true }).catch(() => {
        /* toast handled by mutation */
      });
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, isDirty, canEdit, isFinal, persistDraft]);

  // Warn on unload with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current || isFinal) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isFinal]);

  useEffect(() => {
    if (data?.form?.data) {
      // Never clobber in-progress edits with a cache refresh from auto-save
      if (isDirtyRef.current) return;
      skipNextAutoSaveRef.current = true;
      setFormData(data.form.data);
      setMissingItems([]);
      if (data.form.updatedAt) {
        setLastSavedAt(new Date(data.form.updatedAt));
      }
    }
  }, [data?.form?.data, data?.form?.updatedAt]);

  const jumpToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      const expandBtn = el.querySelector('button[aria-expanded="false"]') as HTMLButtonElement | null;
      expandBtn?.click();
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  // Track active section while scrolling
  useEffect(() => {
    const ids = NOR_FIELD_GROUPS.map((g) => g.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSectionId(visible.target.id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data?.form?.id]);

  const handleSave = () => {
    if (!canEdit) return;
    void persistDraft({ silent: false });
  };

  const handleFinalize = async () => {
    if (!canEdit) return;
    setShowFinalizeConfirm(false);
    setMissingItems([]);

    try {
      if (isDirtyRef.current) {
        await persistDraft({ silent: true });
      }
      await finalizeMutation.mutateAsync();
    } catch (err) {
      if (err instanceof IntraOpFinalizeValidationError) {
        setMissingItems(err.missingItems);
        setShowMissingItems(true);
      }
    }
  };

  const completion = getIntraOpSectionCompletion(formData);
  const readiness = computeFinalizeReadiness(formData);
  const hasDiscrepancy = formData.countCorrect === 'N';

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-sm text-slate-500">
        Please log in.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-sm text-slate-600">
          {(error as Error)?.message || 'Failed to load nursing operation record'}
        </CardContent>
      </Card>
    );
  }

  if (!data.form) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-sm text-slate-600">
          Nursing operation record has not been started yet.
        </CardContent>
      </Card>
    );
  }

  const saveStatusText = saveMutation.isPending
    ? 'Saving…'
    : isDirty
      ? 'Unsaved changes — auto-saves shortly'
      : lastSavedAt
        ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'All changes saved';

  return (
    <div className="min-h-screen">
      <div className="w-full space-y-4 pb-28">
        {/* Progress + section nav — top of document */}
        <div className="sticky top-0 z-30 -mx-1 px-1 py-2.5 space-y-2.5 bg-slate-50/95 backdrop-blur border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            {!isFinal ? (
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      readiness.percent >= 100 ? 'bg-emerald-500' : 'bg-[#caa26a]',
                    )}
                    style={{ width: `${readiness.percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <Badge
              className={cn(
                'shrink-0 border',
                isFinal
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200',
              )}
            >
              {isFinal ? 'FINAL' : `${readiness.percent}%`}
            </Badge>
            {hasDiscrepancy && !isFinal && (
              <Badge className="shrink-0 bg-rose-100 text-rose-700 border border-rose-200">
                Count incorrect
              </Badge>
            )}
            <Button variant="outline" size="sm" className="shrink-0 h-7" asChild>
              <Link href={`/nurse/intra-op-cases/${caseId}/record/print`}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print
              </Link>
            </Button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
            {NAV_CHIPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => jumpToSection(g.id)}
                className={cn(
                  'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  activeSectionId === g.id
                    ? 'border-[#caa26a] bg-[#caa26a]/10 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  'critical' in g && g.critical && activeSectionId !== g.id
                    ? 'border-rose-200 text-rose-800'
                    : '',
                )}
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>

        {hasDiscrepancy && !isFinal && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium truncate">Count marked incorrect</span>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-rose-800 underline shrink-0"
              onClick={() => jumpToSection('nor-counts')}
            >
              Go to Counts
            </button>
          </div>
        )}

        <Card id="nor-page-1" className="scroll-mt-28">
          <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Page 1 — Pre-operative Nursing Record</CardTitle>
            <Badge
              variant="outline"
              className={
                completion.page1?.complete
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-slate-200 text-slate-500'
              }
            >
              {completion.page1?.complete ? 'ID complete' : 'ID pending'}
            </Badge>
          </CardHeader>
          <CardContent>
            <Page1PreOpSection
              data={formData}
              disabled={isDisabled || !canEdit}
              onChange={(next) => {
                setFormData(next);
                setIsDirty(true);
              }}
            />
          </CardContent>
        </Card>

        <Card id="nor-page-2" className="scroll-mt-28">
          <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              Page 2 — Nursing Operation Record (Intra-operative)
            </CardTitle>
            <Badge
              variant="outline"
              className={
                completion.page2?.complete
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-amber-200 text-amber-700 bg-amber-50'
              }
            >
              {completion.page2?.complete ? 'Counts ready' : 'Counts pending'}
            </Badge>
          </CardHeader>
          <CardContent>
            <Page2IntraOpSection
              data={formData}
              disabled={isDisabled || !canEdit}
              caseId={caseId}
              onChange={(next) => {
                setFormData(next);
                setIsDirty(true);
              }}
            />
          </CardContent>
        </Card>

        <IntraOpReviewPanel data={formData} missingItems={missingItems} isFinal={!!isFinal} />
      </div>

      <IntraOpMissingItemsDialog
        open={showMissingItems}
        onOpenChange={setShowMissingItems}
        items={missingItems}
        onJumpToSection={jumpToSection}
      />

      {/* Finalize confirm */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Finalize &amp; sign?</h3>
              <p className="text-sm text-slate-600 mt-1">
                This locks the record and applies scrub / circulating nurse signatures from the names
                on the form. You won&apos;t be able to edit after this.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFinalizeConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleFinalize()}
                disabled={finalizeMutation.isPending || saveMutation.isPending}
              >
                {finalizeMutation.isPending || saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Confirm finalize
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      {!isFinal && canEdit && (
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200 z-40">
          <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-5 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 min-w-0 truncate">{saveStatusText}</div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !isDirty}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (readiness.percent < 70) {
                    toast.message('Review readiness first', {
                      description: `About ${readiness.percent}% of finalize requirements are met. You can still try — missing items will be listed.`,
                    });
                  }
                  setShowFinalizeConfirm(true);
                }}
                disabled={finalizeMutation.isPending || saveMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Finalize &amp; Sign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
