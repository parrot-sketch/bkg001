'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import {
  useIntraOpRecord,
  useSaveIntraOpRecord,
  useFinalizeIntraOpRecord,
  IntraOpFinalizeValidationError,
} from '@/hooks/nurse/useIntraOpRecord';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { createEmptyIntraOpDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Loader2, Printer, Save } from 'lucide-react';
import { Page1PreOpSection } from './sections/Page1PreOpSection';
import { Page2IntraOpSection } from './sections/Page2IntraOpSection';

interface Props {
  caseId: string;
}

export function NursingOperationRecordEditor({ caseId }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { data, isLoading, error } = useIntraOpRecord(caseId);
  const saveMutation = useSaveIntraOpRecord(caseId);
  const finalizeMutation = useFinalizeIntraOpRecord(caseId);

  const [formData, setFormData] = useState<NurseIntraOpRecordDraft>(createEmptyIntraOpDraft());
  const [isDirty, setIsDirty] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  const isFinal = data?.form?.status === 'FINAL';
  const isDisabled = !isAuthenticated || !!isFinal;

  const canEdit = useMemo(() => user?.role === 'NURSE', [user?.role]);

  useEffect(() => {
    if (data?.form?.data) {
      setFormData(data.form.data);
      setIsDirty(false);
      setMissingItems([]);
    }
  }, [data?.form?.data]);

  const handleSave = () => {
    if (!canEdit) return;
    saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) });
  };

  const handleFinalize = () => {
    if (!canEdit) return;
    setMissingItems([]);
    finalizeMutation.mutate(undefined, {
      onError: (err) => {
        if (err instanceof IntraOpFinalizeValidationError) {
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
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="max-w-5xl mx-auto">
        <CardContent className="p-6 text-sm text-slate-600">
          {(error as Error)?.message || 'Failed to load nursing operation record'}
        </CardContent>
      </Card>
    );
  }

  if (!data.form) {
    return (
      <Card className="max-w-5xl mx-auto">
        <CardContent className="p-6 text-sm text-slate-600">
          Nursing operation record has not been started yet.
        </CardContent>
      </Card>
    );
  }

  const hasDiscrepancy = formData.countCorrect === 'N';

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Nursing Operation Record
            </h2>
            <Badge
              className={
                isFinal
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }
            >
              {isFinal ? 'FINAL' : 'DRAFT'}
            </Badge>
            {hasDiscrepancy && !isFinal && (
              <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                Count incorrect
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Nairobi Sculpt Aesthetic Centre — 2-page nursing operation record.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/nurse/intra-op-cases/${caseId}/record/print`}>
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
                Finalize &amp; Sign
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
                {missingItems.slice(0, 12).map((m) => (
                  <li key={m}>{m}</li>
                ))}
                {missingItems.length > 12 && <li>+{missingItems.length - 12} more…</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Page 1 — Pre-operative Nursing Record</CardTitle>
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

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Page 2 — Nursing Operation Record (Intra-operative)</CardTitle>
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
    </div>
  );
}

