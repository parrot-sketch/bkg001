'use client';

/**
 * Nurse Pre-Operative Ward Checklist Page
 *
 * This route is the authoritative UI used by nurses:
 * - Fetches the `NURSE_PREOP_WARD_CHECKLIST` ClinicalFormResponse
 * - Allows draft saves + finalization
 * - Prints via the existing (print) route group
 *
 * NOTE: The actual field rendering is modularized under:
 * `components/nurse/ward-prep-checklist/*`
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/patient/useAuth';
import {
  FinalizeValidationError,
  preopWardChecklistKeys,
  useFinalizePreopWardChecklist,
  usePreopWardChecklist,
  useSavePreopWardChecklist,
} from '@/hooks/nurse/usePreopWardChecklist';
import type { NursePreopWardChecklistDraft, MissingChecklistItem } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { CHECKLIST_SECTIONS, normalizeLegacyChecklistData } from '@/domain/clinical-forms/NursePreopWardChecklist';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { FinalizeChecklistDialog } from '@/components/nurse/ward-prep-checklist/components/FinalizeChecklistDialog';
import { MissingItemsDialog } from '@/components/nurse/ward-prep-checklist/components/MissingItemsDialog';
import { PaperHeaderSection } from '@/components/nurse/ward-prep-checklist/components/PaperHeaderSection';
import { StartAmendmentDialog } from '@/components/nurse/ward-prep-checklist/components/StartAmendmentDialog';
import { FinalizedChecklistDocument } from '@/components/nurse/ward-prep-checklist/components/FinalizedChecklistDocument';
import { todayYmd } from '@/components/nurse/ward-prep-checklist/utils';
import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import {
  AllergiesNpoSection,
  BloodResultsSection,
  DocumentationSection,
  HandoverSection,
  MedicationsSection,
  NursingCommentsSection,
  PreparationSection,
  ProstheticsSection,
  VitalsSection,
} from '@/components/nurse/ward-prep-checklist/sections';

const SECTION_RENDERERS: Record<string, React.FC<WardChecklistSectionProps>> = {
  documentation: DocumentationSection,
  bloodResults: BloodResultsSection,
  medications: MedicationsSection,
  allergiesNpo: AllergiesNpoSection,
  preparation: PreparationSection,
  prosthetics: ProstheticsSection,
  vitals: VitalsSection,
  handover: HandoverSection as unknown as React.FC<WardChecklistSectionProps>,
  nursingComments: NursingCommentsSection as unknown as React.FC<WardChecklistSectionProps>,
};

export default function NursePreopWardChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const caseId = params?.id as string;

  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = returnTo && returnTo.startsWith('/') ? returnTo : '/nurse/ward-prep';
  const backLabel =
    safeReturnTo.startsWith('/nurse/intra-op') || safeReturnTo === '/nurse/theatre-support'
      ? 'Back to Intra-Op'
      : safeReturnTo.startsWith('/nurse/post-op') || safeReturnTo === '/nurse/recovery-discharge'
        ? 'Back to Post-Op'
        : 'Back to Ward Prep';

  const { data: response, isLoading, error } = usePreopWardChecklist(caseId);
  const saveMutation = useSavePreopWardChecklist(caseId);
  const finalizeMutation = useFinalizePreopWardChecklist(caseId);

  const [formData, setFormData] = useState<NursePreopWardChecklistDraft>({
    header: { date: todayYmd(), nursingComments: '' },
    documentation: {},
    bloodResults: {},
    medications: {},
    allergiesNpo: {},
    preparation: {},
    prosthetics: {},
    vitals: {},
    handover: {},
  });
  const [isDirty, setIsDirty] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showMissingItems, setShowMissingItems] = useState(false);
  const [missingItemsList, setMissingItemsList] = useState<string[]>([]);
  const [missingItemsDetailed, setMissingItemsDetailed] = useState<MissingChecklistItem[]>([]);
  const [showAmendDialog, setShowAmendDialog] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [isAmending, setIsAmending] = useState(false);
  const [amendError, setAmendError] = useState('');

  useEffect(() => {
    if (!response?.form?.data) return;
    const normalized = normalizeLegacyChecklistData(response.form.data);
    normalized.header = normalized.header || { date: todayYmd(), nursingComments: '' };
    if (!normalized.header.date) normalized.header.date = todayYmd();

    const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || '';
    if (userName) {
      normalized.handover = normalized.handover || {};
      if (!normalized.handover.preparedByName) normalized.handover.preparedByName = userName;
      if (!normalized.handover.handedOverByName) normalized.handover.handedOverByName = userName;
    }

    setFormData(normalized);
    setIsDirty(false);
  }, [response?.form?.data, user]);

  const formStatus = response?.form?.status;
  const isFinalized = formStatus === 'FINAL';
  const isAmendment = formStatus === 'AMENDMENT';
  const isDisabled = isFinalized || !isAuthenticated;

  const handleChange = useCallback((next: NursePreopWardChecklistDraft) => {
    setFormData(next);
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    saveMutation.mutate(formData, {
      onSuccess: () => {
        setIsDirty(false);
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to save checklist');
      },
    });
  };

  const jumpToSection = useCallback((sectionKey: string) => {
    const el = document.getElementById(`ward-section-${sectionKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
      window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
      }, 1800);
    }
  }, []);

  const handleFinalize = () => {
    const runFinalize = () => {
      finalizeMutation.mutate(undefined, {
        onSuccess: () => {
          setShowFinalizeDialog(false);
          router.push(`/nurse/intra-op-cases/${caseId}/record`);
        },
        onError: (e) => {
          setShowFinalizeDialog(false);
          if (e instanceof FinalizeValidationError) {
            setMissingItemsList(e.missingItems);
            setMissingItemsDetailed(e.missingItemsDetailed || []);
            setShowMissingItems(true);
            return;
          }
          toast.error(e instanceof Error ? e.message : 'Failed to finalize checklist');
        },
      });
    };

    // Always persist current UI state before finalize — finalize reads saved JSON only.
    if (isDirty) {
      saveMutation.mutate(formData, {
        onSuccess: () => {
          setIsDirty(false);
          runFinalize();
        },
        onError: (e) => {
          setShowFinalizeDialog(false);
          toast.error(e instanceof Error ? e.message : 'Save failed — cannot finalize unsaved changes');
        },
      });
      return;
    }

    runFinalize();
  };

  const handleStartAmendment = async () => {
    if (amendReason.trim().length < 10) {
      setAmendError('Please provide a reason of at least 10 characters.');
      return;
    }
    setAmendError('');
    setIsAmending(true);
    try {
      const res = await fetch(`/api/nurse/surgical-cases/${caseId}/forms/preop-ward/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: amendReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAmendError(json.error || 'Failed to start amendment.');
      } else {
        setShowAmendDialog(false);
        setAmendReason('');
        setIsDirty(false);
        toast.success('Amendment started. You can now edit this checklist.');
        // React Query drives the form state; invalidate to refresh status from FINAL → AMENDMENT immediately.
        await queryClient.invalidateQueries({ queryKey: preopWardChecklistKeys.detail(caseId) });
      }
    } catch {
      setAmendError('Network error. Please try again.');
    } finally {
      setIsAmending(false);
    }
  };

  const persistSignature = useCallback(
    async (args: {
      role: 'PREPARED_BY' | 'RECEIVED_BY' | 'HANDED_OVER_BY';
      value: { signerName: string; signatureDataUrl: string; signedAt?: string };
    }) => {
      const res = await fetch(`/api/nurse/surgical-cases/${caseId}/forms/preop-ward/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: args.role,
          signerName: args.value.signerName,
          signatureDataUrl: args.value.signatureDataUrl,
          draftData: formData,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: { form?: { data?: NursePreopWardChecklistDraft } } };
      if (!res.ok || !json.success || !json.data?.form?.data) {
        throw new Error(json.error || 'Failed to save signature');
      }
      setFormData(json.data.form.data);
      setIsDirty(false);
      toast.success('Signature saved');
    },
    [caseId, formData],
  );

  const sectionCompletion = response?.form?.sectionCompletion ?? {};
  // Progress is based only on the visible checklist sections (excludes header).
  const completedSections = CHECKLIST_SECTIONS.filter(
    (s) => sectionCompletion[s.key as string]?.complete === true,
  ).length;
  const totalSections = CHECKLIST_SECTIONS.length;
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  const paperHeaderProgress = useMemo(
    () => ({ completedSections, totalSections, percent: progressPercent }),
    [completedSections, totalSections, progressPercent],
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access the checklist.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !response || !response.form) {
    return (
      <div className="mx-auto w-full max-w-[920px] space-y-6 px-4 py-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={safeReturnTo}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {backLabel}
          </Link>
        </Button>
        <div className="border border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">{(error as Error)?.message || 'Failed to load checklist'}</p>
        </div>
      </div>
    );
  }

  const patient = response.patient;
  const form = response.form;

  return (
    <div className="min-h-screen bg-[#e8e6e1]">
      <div className="mx-auto w-full max-w-[920px] px-3 sm:px-4 py-4 sm:py-6 pb-28 animate-in fade-in duration-300">
        <div className="mb-3">
          <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-white/60 -ml-2" asChild>
            <Link href={safeReturnTo}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
            </Link>
          </Button>
        </div>

        {isFinalized && !isAmendment ? (
          <FinalizedChecklistDocument
            caseId={caseId}
            patient={patient}
            surgeonName={response.surgeonName}
            anaesthesiologistName={response.anaesthesiologistName || null}
            data={formData}
          />
        ) : (
          <article className="bg-white border border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="px-5 sm:px-8 lg:px-10 pt-6 sm:pt-8">
              <PaperHeaderSection
                caseId={caseId}
                patient={patient}
                surgeonName={response.surgeonName}
                anaesthesiologistName={response.anaesthesiologistName || null}
                headerDate={formData.header?.date}
                onHeaderDateChange={(date) => handleChange({ ...formData, header: { ...formData.header, date } })}
                disabled={isDisabled}
                isFinalized={isFinalized}
                isAmendment={isAmendment}
                progress={paperHeaderProgress}
                onStartAmendment={() => setShowAmendDialog(true)}
              />
            </div>

            <nav className="sticky top-0 z-20 border-y border-slate-200 bg-white/95 backdrop-blur px-5 sm:px-8 lg:px-10 py-2.5">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => jumpToSection('header')}
                  className="shrink-0 border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400"
                >
                  Notes
                </button>
                {CHECKLIST_SECTIONS.map((section, idx) => {
                  const complete = sectionCompletion[section.key as string]?.complete === true;
                  const shortTitle = section.title.replace(/^\d+\.\s*/, '').split('(')[0].trim().slice(0, 22);
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => jumpToSection(section.key)}
                      className={`shrink-0 border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        complete
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {idx + 1}. {shortTitle}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="px-5 sm:px-8 lg:px-10 py-6 sm:py-8">
              <section id="ward-section-header" className="scroll-mt-28 pb-6 border-b border-slate-200">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900">
                  Nursing comments / observations
                </h2>
                <NursingCommentsSection
                  data={formData}
                  onChange={handleChange}
                  disabled={isDisabled}
                  caseId={caseId}
                  patient={patient}
                  formResponseId={form.id}
                />
              </section>

              {CHECKLIST_SECTIONS.map((section, idx) => {
                const SectionRenderer = SECTION_RENDERERS[section.key as string];
                const sectionComplete = sectionCompletion[section.key as string]?.complete ?? false;
                return (
                  <section
                    key={section.key}
                    id={`ward-section-${section.key}`}
                    className="scroll-mt-28 py-6 border-b border-slate-200 last:border-b-0"
                  >
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900">
                        <span className="mr-2 tabular-nums text-slate-400">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {section.title}
                      </h2>
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${
                          sectionComplete ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {sectionComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                    {SectionRenderer ? (
                      <SectionRenderer
                        data={formData}
                        onChange={handleChange}
                        disabled={isDisabled}
                        caseId={caseId}
                        patient={patient}
                        formResponseId={form.id}
                        patientAllergies={patient.allergies}
                        currentUser={user}
                        onPersistSignature={persistSignature as WardChecklistSectionProps['onPersistSignature']}
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
          </article>
        )}

        <FinalizeChecklistDialog
          open={showFinalizeDialog}
          onOpenChange={setShowFinalizeDialog}
          onConfirm={handleFinalize}
          isPending={finalizeMutation.isPending || saveMutation.isPending}
        />

        <MissingItemsDialog
          open={showMissingItems}
          onOpenChange={setShowMissingItems}
          items={missingItemsList}
          detailedItems={missingItemsDetailed}
          onJumpToSection={jumpToSection}
        />

        <StartAmendmentDialog
          open={showAmendDialog}
          onOpenChange={setShowAmendDialog}
          reason={amendReason}
          onReasonChange={setAmendReason}
          error={amendError}
          isPending={isAmending}
          onStart={handleStartAmendment}
        />
      </div>

      {!isFinalized && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-300 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-[920px] px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isDirty ? 'Unsaved changes' : 'All changes saved'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !isDirty}
                variant="outline"
                className="gap-1.5"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </Button>
              <Button
                onClick={() => setShowFinalizeDialog(true)}
                disabled={saveMutation.isPending}
                className="gap-1.5 bg-[#2c2e4b] hover:bg-[#1e2038] text-white"
              >
                <Lock className="h-4 w-4" />
                Finalize
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

