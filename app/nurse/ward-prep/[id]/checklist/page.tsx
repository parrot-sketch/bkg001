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
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="space-y-6 w-full">
        <Button variant="ghost" size="sm" asChild>
          <Link href={safeReturnTo}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{(error as Error)?.message || 'Failed to load checklist'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = response.patient;
  const form = response.form;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="w-full space-y-5 pb-24 animate-in fade-in duration-500">
        {/* Navigation */}
        <div className="flex items-center gap-2 pt-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={safeReturnTo}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
            </Link>
          </Button>
        </div>

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

        {/* Sections */}
        {isFinalized && !isAmendment ? (
          <FinalizedChecklistDocument
            caseId={caseId}
            patient={patient}
            surgeonName={response.surgeonName}
            anaesthesiologistName={response.anaesthesiologistName || null}
            data={formData}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Nursing Comments - full width open text box */}
            <Card id="ward-section-header" className="xl:col-span-2 overflow-hidden border-slate-200 shadow-sm scroll-mt-24">
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5">00</span>
                <span className="font-semibold text-sm text-slate-900">Nursing Comments / Observations</span>
              </div>
              <CardContent className="p-5 sm:p-6">
                <NursingCommentsSection
                  data={formData}
                  onChange={handleChange}
                  disabled={isDisabled}
                  caseId={caseId}
                  patient={patient}
                  formResponseId={form.id}
                />
              </CardContent>
            </Card>

            {CHECKLIST_SECTIONS.map((section, idx) => {
              const SectionRenderer = SECTION_RENDERERS[section.key as string];
              const sectionComplete = sectionCompletion[section.key as string]?.complete ?? false;
              const fullWidth =
                section.key === 'medications' ||
                section.key === 'handover' ||
                section.key === 'vitals';
              return (
                <Card
                  key={section.key}
                  id={`ward-section-${section.key}`}
                  className={`overflow-hidden border-slate-200 shadow-sm scroll-mt-24 transition-shadow ${
                    fullWidth ? 'xl:col-span-2' : ''
                  }`}
                >
                  <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="font-semibold text-sm text-slate-900">{section.title}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        sectionComplete
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {sectionComplete ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                  <CardContent className="p-5 sm:p-6">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

      {/* Sticky action bar */}
      {!isFinalized && (
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200 z-40">
          <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-5 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
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
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
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

