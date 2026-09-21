'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/hooks/patient/useAuth';
import {
  useOperativeNote,
  useSaveOperativeNote,
  useFinalizeOperativeNote,
  OperativeNoteFinalizeValidationError,
} from '@/hooks/doctor/useOperativeNote';
import {
  getMissingOperativeNoteItemsForUi,
  type SurgeonOperativeNoteDraft,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import { stripToPlain } from '@/components/doctor/operative-record/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { HeaderSection } from '@/components/doctor/operative-record/sections/HeaderSection';
import { ProcedureNotesSection } from '@/components/doctor/operative-record/sections/ProcedureNotesSection';
import { CountsSection } from '@/components/doctor/operative-record/sections/CountsSection';
import { Page2Section } from '@/components/doctor/operative-record/sections/Page2Section';
import { OperativeNotePrintButton } from '@/components/doctor/operative-record/OperativeNotePrintButton';

interface Props {
  caseId: string;
  caseProcedureNames?: string;
  initialDiagnosis?: string;
}

const EMPTY_DRAFT: SurgeonOperativeNoteDraft = {
  header: {
    diagnosisPreOp: '',
    diagnosisPostOp: '',
    procedurePlanned: '',
    procedurePerformed: '',
    side: '',
    surgeonId: '',
    surgeonName: '',
    assistants: [],
    anesthesiologistId: '',
    anesthesiologistName: '',
    anesthesiaType: 'GENERAL',
    shavingY: false,
    shavingN: false,
    shavingExtent: '',
    skinPrepY: false,
    skinPrepN: false,
  },
  intraOpMetrics: {},
  implantsUsed: { implantsUsed: [] },
  specimens: { specimens: [] },
  complications: {
    complicationsOccurred: false,
    complicationsDetails: '',
  },
  postOpPlan: {
    dressingInstructions: '',
    drainCare: '',
    meds: '',
    followUpPlan: '',
  },
  findingsAndSteps: {
    findings: '',
    operativeSteps: '',
  },
  operativeRecord: {
    operationRecord: '',
    postOperativeInstructions: '',
    surgeonOrAnesthesiologistSignaturePng: '',
  },
  countsConfirmation: {
    countsCorrectY: false,
    countsCorrectN: false,
    countsExplanation: '',
    scrubNurseSignaturePng: '',
    surgeonSignaturePage1Png: '',
  },
};

const STEPS = [
  {
    id: 'case',
    label: 'Case',
    title: 'Case details',
    description: 'Diagnoses, procedures, team, and prep',
    icon: ClipboardList,
  },
  {
    id: 'notes',
    label: 'Notes',
    title: 'Operative notes',
    description: 'Findings and steps performed',
    icon: FileText,
  },
  {
    id: 'counts',
    label: 'Counts',
    title: 'Counts',
    description: 'Swab and instrument confirmation',
    icon: ShieldCheck,
  },
  {
    id: 'closeout',
    label: 'Close-out',
    title: 'Close-out',
    description: 'Record summary and post-op plan',
    icon: CheckCircle2,
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function stepHasContent(id: StepId, data: SurgeonOperativeNoteDraft): boolean {
  switch (id) {
    case 'case': {
      const h = data.header ?? {};
      return Boolean(
        stripToPlain(h.diagnosisPreOp) ||
          stripToPlain(h.diagnosisPostOp) ||
          stripToPlain(h.procedurePerformed) ||
          h.surgeonName,
      );
    }
    case 'notes': {
      const f = data.findingsAndSteps ?? {};
      return Boolean(stripToPlain(f.findings) || stripToPlain(f.operativeSteps));
    }
    case 'counts': {
      const c = data.countsConfirmation ?? {};
      return Boolean(c.countsCorrectY || c.countsCorrectN);
    }
    case 'closeout': {
      const r = data.operativeRecord ?? {};
      return Boolean(
        stripToPlain(r.operationRecord) || stripToPlain(r.postOperativeInstructions),
      );
    }
    default:
      return false;
  }
}

function stepForMissingPath(path: string): StepId | null {
  const key = path.split('.')[0] || path;
  if (key === 'header') return 'case';
  if (key === 'findingsAndSteps') return 'notes';
  if (key === 'countsConfirmation') return 'counts';
  if (
    key === 'operativeRecord' ||
    key === 'complications' ||
    key === 'intraOpMetrics' ||
    key === 'postOpPlan'
  ) {
    return 'closeout';
  }
  return null;
}

function friendlyMissingLabel(item: string): string {
  const [path, ...rest] = item.split(':');
  const message = rest.join(':').trim();
  const map: Record<string, string> = {
    'header.anesthesiaType': 'Anaesthesia type',
    'header.diagnosisPreOp': 'Pre-op diagnosis',
    'header.diagnosisPostOp': 'Operative diagnosis',
    'header.procedurePerformed': 'Procedure performed',
    'header.surgeonId': 'Surgeon',
    'findingsAndSteps.operativeSteps': 'Operative steps',
    'operativeRecord.operationRecord': 'Operation record',
    'operativeRecord.postOperativeInstructions': 'Post-op instructions',
    'countsConfirmation.countsCorrectY': 'Counts confirmation',
    'countsConfirmation.countsExplanation': 'Counts explanation',
  };
  const label = map[path.trim()] || path.trim();
  if (/at least \d+ characters/i.test(message)) return `${label} (too short)`;
  if (/Required/i.test(message)) return `${label} (required)`;
  return label;
}

function extractMissingItems(err: unknown): string[] | null {
  if (err instanceof OperativeNoteFinalizeValidationError) return err.missingItems;
  if (err && typeof err === 'object' && Array.isArray((err as any).missingItems)) {
    return (err as any).missingItems as string[];
  }
  return null;
}

export function OperativeRecordEditor({ caseId, caseProcedureNames, initialDiagnosis }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { data, isLoading, error } = useOperativeNote(caseId);
  const saveMutation = useSaveOperativeNote(caseId);
  const finalizeMutation = useFinalizeOperativeNote(caseId);

  const [formData, setFormData] = useState<SurgeonOperativeNoteDraft>(EMPTY_DRAFT);
  const [isDirty, setIsDirty] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [step, setStep] = useState<StepId>('case');
  const [savedFlash, setSavedFlash] = useState(false);
  const seededFormIdRef = useRef<string | null>(null);

  const isFinal = data?.form?.status === 'FINAL';
  const isDisabled = !isAuthenticated || !!isFinal;
  const nurseHasDiscrepancy = data?.nurseHasDiscrepancy === true;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const current = STEPS[stepIndex] ?? STEPS[0];
  const busy = saveMutation.isPending || finalizeMutation.isPending;

  useEffect(() => {
    const formId = data?.form?.id ?? null;
    const nextData = data?.form?.data;
    if (!nextData || !formId) return;

    // Re-seed on first load or when switching forms — avoid wiping local edits / missing hints on save refetch
    const isFirstSeed = seededFormIdRef.current !== formId;
    if (!isFirstSeed && isDirty) return;

    const seeded = { ...nextData };
    const header = { ...(seeded.header ?? EMPTY_DRAFT.header) };
    let appliedDefaults = false;
    if (!header.diagnosisPreOp && initialDiagnosis) {
      header.diagnosisPreOp = initialDiagnosis;
      appliedDefaults = true;
    }
    if (!header.procedurePlanned && (caseProcedureNames || data.procedureName)) {
      header.procedurePlanned = caseProcedureNames || data.procedureName || '';
      appliedDefaults = true;
    }
    if (!header.surgeonName && data.surgeonName) {
      header.surgeonName = data.surgeonName;
      appliedDefaults = true;
    }
    if (!header.surgeonId && (data.surgeonName || header.surgeonName)) {
      header.surgeonId = header.surgeonId || 'primary';
      appliedDefaults = true;
    }
    if (!header.anesthesiaType) {
      header.anesthesiaType = 'GENERAL';
      appliedDefaults = true;
    }
    seeded.header = header;
    setFormData(seeded);
    seededFormIdRef.current = formId;
    if (isFirstSeed) {
      setMissingItems([]);
    }
    // Persist seeded defaults so finalize (server-side) sees them
    setIsDirty(appliedDefaults);
  }, [
    data?.form?.id,
    data?.form?.data,
    initialDiagnosis,
    caseProcedureNames,
    data?.procedureName,
    data?.surgeonName,
    isDirty,
  ]);

  const canEdit = useMemo(() => user?.role === 'DOCTOR', [user]);

  const applyMissingItems = (items: string[]) => {
    const actionable = items.filter((m) => !/signature/i.test(m));
    setMissingItems(actionable);
    const firstStep = actionable
      .map((m) => stepForMissingPath(m.split(':')[0] || m))
      .find((s): s is StepId => !!s);
    if (firstStep) setStep(firstStep);
  };

  const setField = <K extends keyof SurgeonOperativeNoteDraft>(
    key: K,
    value: SurgeonOperativeNoteDraft[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSavedFlash(false);
    if (missingItems.length > 0) {
      const remaining = getMissingOperativeNoteItemsForUi(
        { ...formData, [key]: value },
        nurseHasDiscrepancy,
      );
      setMissingItems(remaining);
    }
  };

  const handleSave = (opts?: { silent?: boolean }) => {
    if (!canEdit) return;
    saveMutation.mutate(
      { data: formData, silent: opts?.silent },
      {
        onSuccess: () => {
          setIsDirty(false);
          setSavedFlash(true);
        },
      },
    );
  };

  const handleFinalize = () => {
    if (!canEdit) return;

    const localMissing = getMissingOperativeNoteItemsForUi(formData, nurseHasDiscrepancy);
    if (localMissing.length > 0) {
      applyMissingItems(localMissing);
      return;
    }

    setMissingItems([]);
    // Always persist current editor state before finalize — server validates stored JSON
    saveMutation.mutate(
      { data: formData, silent: true },
      {
        onSuccess: () => {
          setIsDirty(false);
          finalizeMutation.mutate(undefined, {
            onError: (err) => {
              const items = extractMissingItems(err);
              if (items) applyMissingItems(items);
            },
          });
        },
      },
    );
  };

  const goNext = () => {
    if (isDirty && canEdit) handleSave({ silent: true });
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1].id);
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id);
  };

  const missingSteps = useMemo(() => {
    const ids = new Set<StepId>();
    for (const item of missingItems) {
      const s = stepForMissingPath(item.split(':')[0] || item);
      if (s) ids.add(s);
    }
    return STEPS.filter((s) => ids.has(s.id));
  }, [missingItems]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-slate-500">
        Please log in.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700">
        {(error as Error)?.message || 'Failed to load operative note'}
      </div>
    );
  }

  if (!data.form) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-600">
        Operative note has not been started yet.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            isFinal
              ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
              : 'border border-amber-200 bg-amber-100 text-amber-800'
          }
        >
          {isFinal ? 'Final' : 'Draft'}
        </Badge>
        {nurseHasDiscrepancy ? (
          <Badge className="border border-rose-200 bg-rose-100 text-rose-800">
            Nurse count discrepancy
          </Badge>
        ) : null}
        {isDirty ? (
          <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
        ) : savedFlash ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const active = s.id === step;
          const filled = stepHasContent(s.id, formData);
          const hasGap = missingSteps.some((m) => m.id === s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                'flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors',
                active
                  ? 'bg-[#2c2e4b] text-white'
                  : hasGap
                    ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100'
                    : filled
                      ? 'bg-[#e7d6bf]/40 text-[#2c2e4b] hover:bg-[#e7d6bf]/70'
                      : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              {hasGap && !active ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              ) : filled && !active ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-700" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-semibold">
                  {idx + 1}. {s.label}
                </span>
                <span
                  className={cn(
                    'hidden truncate text-[10px] sm:block',
                    active ? 'text-white/70' : hasGap ? 'text-amber-700/80' : 'text-slate-400',
                  )}
                >
                  {hasGap ? 'Needs attention' : s.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {missingItems.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Complete these before finalize — tap to jump</p>
              <div className="flex flex-wrap gap-2">
                {missingItems.slice(0, 8).map((m) => {
                  const target = stepForMissingPath(m.split(':')[0] || m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => target && setStep(target)}
                      className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    >
                      {friendlyMissingLabel(m)}
                      {target ? ` → ${STEPS.find((s) => s.id === target)?.label}` : ''}
                    </button>
                  );
                })}
                {missingItems.length > 8 ? (
                  <span className="text-xs text-amber-800">+{missingItems.length - 8} more…</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-[#2c2e4b]">{current.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{current.description}</p>
        </div>

        {step === 'case' ? (
          <HeaderSection
            value={formData.header}
            disabled={isDisabled || !canEdit}
            onChange={(next) => setField('header', next)}
            caseProcedureName={caseProcedureNames || data?.procedureName}
            initialDiagnosis={initialDiagnosis}
            surgeonNameHint={data?.surgeonName}
          />
        ) : null}

        {step === 'notes' ? (
          <ProcedureNotesSection
            value={formData.findingsAndSteps}
            disabled={isDisabled || !canEdit}
            onChange={(next) => setField('findingsAndSteps', next)}
          />
        ) : null}

        {step === 'counts' ? (
          <CountsSection
            value={formData.countsConfirmation}
            disabled={isDisabled || !canEdit}
            nurseHasDiscrepancy={nurseHasDiscrepancy}
            onChange={(next) => setField('countsConfirmation', next)}
          />
        ) : null}

        {step === 'closeout' ? (
          <Page2Section
            value={formData.operativeRecord}
            metrics={formData.intraOpMetrics}
            complications={formData.complications}
            postOpPlan={formData.postOpPlan}
            disabled={isDisabled || !canEdit}
            onChangeRecord={(next) => setField('operativeRecord', next)}
            onChangeMetrics={(next) => setField('intraOpMetrics', next)}
            onChangeComplications={(next) => setField('complications', next)}
            onChangePostOpPlan={(next) => setField('postOpPlan', next)}
          />
        ) : null}
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={stepIndex === 0 || busy}
            onClick={goBack}
            className="gap-1 text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <span className="hidden text-xs text-slate-400 sm:inline">
            Step {stepIndex + 1} of {STEPS.length}
          </span>

          {missingSteps.length > 0 && missingSteps[0].id !== step ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(missingSteps[0].id)}
              className="gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Go to {missingSteps[0].label}
            </Button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <OperativeNotePrintButton caseId={caseId} />

            {canEdit && !isFinal ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isDirty || busy}
                  onClick={() => handleSave()}
                  className="gap-1.5"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>

                {stepIndex < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={goNext}
                    className="gap-1.5 bg-[#2c2e4b] text-white hover:bg-[#3a3d63]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={handleFinalize}
                    className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
                  >
                    {finalizeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Finalize
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
