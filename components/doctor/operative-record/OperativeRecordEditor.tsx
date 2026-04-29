'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useOperativeNote, useSaveOperativeNote, useFinalizeOperativeNote, OperativeNoteFinalizeValidationError } from '@/hooks/doctor/useOperativeNote';
import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Printer, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { HeaderSection } from '@/components/doctor/operative-record/sections/HeaderSection';
import { ProcedureNotesSection } from '@/components/doctor/operative-record/sections/ProcedureNotesSection';
import { CountsSection } from '@/components/doctor/operative-record/sections/CountsSection';
import { Page2Section } from '@/components/doctor/operative-record/sections/Page2Section';

interface Props {
  caseId: string;
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
  implantsUsed: {},
  specimens: {},
  complications: {},
  postOpPlan: {},
  findingsAndSteps: {},
  operativeRecord: {},
  countsConfirmation: {
    countsCorrectY: false,
    countsCorrectN: false,
    countsExplanation: '',
    scrubNurseSignaturePng: '',
    surgeonSignaturePage1Png: '',
  },
};

export function OperativeRecordEditor({ caseId }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { data, isLoading, error } = useOperativeNote(caseId);
  const saveMutation = useSaveOperativeNote(caseId);
  const finalizeMutation = useFinalizeOperativeNote(caseId);

  const [formData, setFormData] = useState<SurgeonOperativeNoteDraft>(EMPTY_DRAFT);
  const [isDirty, setIsDirty] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  const isFinal = data?.form?.status === 'FINAL';
  const isDisabled = !isAuthenticated || !!isFinal;
  const nurseHasDiscrepancy = data?.nurseHasDiscrepancy === true;

  useEffect(() => {
    if (data?.form?.data) {
      setFormData(data.form.data);
      setIsDirty(false);
      setMissingItems([]);
    }
  }, [data?.form?.data]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return user.role === 'DOCTOR';
  }, [user]);

  const setField = <K extends keyof SurgeonOperativeNoteDraft>(
    key: K,
    value: SurgeonOperativeNoteDraft[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!canEdit) return;
    saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) });
  };

  const handleFinalize = () => {
    if (!canEdit) return;
    setMissingItems([]);
    finalizeMutation.mutate(undefined, {
      onError: (err) => {
        if (err instanceof OperativeNoteFinalizeValidationError) {
          setMissingItems(err.missingItems);
        }
      },
    });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-sm text-slate-500">
        Please log in.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-sm text-slate-600">
          {(error as Error)?.message || 'Failed to load operative record'}
        </CardContent>
      </Card>
    );
  }

  // If assistant/nurse is viewing and doctor hasn't started the form yet
  if (!data.form) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-sm text-slate-600">
          Operative record has not been started yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Operative Record</h2>
            <Badge className={isFinal ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}>
              {isFinal ? 'FINAL' : 'DRAFT'}
            </Badge>
            {nurseHasDiscrepancy && (
              <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                Count discrepancy reported
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Capture the surgeon&apos;s operative record and generate a print-ready document.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/doctor/surgical-cases/${caseId}/operative-record/print`}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Link>
          </Button>
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isDisabled || !isDirty || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleFinalize}
                disabled={isDisabled || finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Finalize & Sign
              </Button>
            </>
          )}
        </div>
      </div>

      {missingItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Missing required items</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-amber-800 space-y-0.5">
                {missingItems.slice(0, 10).map((m) => (
                  <li key={m}>{m}</li>
                ))}
                {missingItems.length > 10 && (
                  <li>+{missingItems.length - 10} more…</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Header</CardTitle>
        </CardHeader>
        <CardContent>
          <HeaderSection
            value={formData.header}
            disabled={isDisabled || !canEdit}
            onChange={(next) => setField('header', next as any)}
            caseProcedureName={data?.procedureName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Operation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureNotesSection
            value={formData.findingsAndSteps}
            disabled={isDisabled || !canEdit}
            onChange={(next) => setField('findingsAndSteps', next as any)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Swab & Instrument Count</CardTitle>
        </CardHeader>
        <CardContent>
          <CountsSection
            value={formData.countsConfirmation}
            disabled={isDisabled || !canEdit}
            nurseHasDiscrepancy={nurseHasDiscrepancy}
            onChange={(next) => setField('countsConfirmation', next as any)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Operation Record (Page 2)</CardTitle>
        </CardHeader>
        <CardContent>
          <Page2Section
            value={formData.operativeRecord}
            disabled={isDisabled || !canEdit}
            onChange={(next) => setField('operativeRecord', next as any)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
