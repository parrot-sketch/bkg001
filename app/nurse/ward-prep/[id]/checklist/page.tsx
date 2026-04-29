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
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { CHECKLIST_SECTIONS, normalizeLegacyChecklistData } from '@/domain/clinical-forms/NursePreopWardChecklist';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { FinalizeChecklistDialog } from '@/components/nurse/ward-prep-checklist/components/FinalizeChecklistDialog';
import { MissingItemsDialog } from '@/components/nurse/ward-prep-checklist/components/MissingItemsDialog';
import { PaperHeaderSection } from '@/components/nurse/ward-prep-checklist/components/PaperHeaderSection';
import { StartAmendmentDialog } from '@/components/nurse/ward-prep-checklist/components/StartAmendmentDialog';
import { WardChecklistActionsHeader } from '@/components/nurse/ward-prep-checklist/components/WardChecklistActionsHeader';
import { FinalizedChecklistDocument } from '@/components/nurse/ward-prep-checklist/components/FinalizedChecklistDocument';
import { todayYmd } from '@/components/nurse/ward-prep-checklist/utils';
import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import {
  AllergiesNpoSection,
  BloodResultsSection,
  DocumentationSection,
  HandoverSection,
  MedicationsSection,
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
};

export default function NursePreopWardChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const caseId = params?.id as string;

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
        toast.success('Checklist saved successfully');
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to save checklist');
      },
    });
  };

  const handleFinalize = () => {
    finalizeMutation.mutate(undefined, {
      onSuccess: () => {
        setShowFinalizeDialog(false);
        router.push('/nurse/ward-prep');
      },
      onError: (e) => {
        setShowFinalizeDialog(false);
        if (e instanceof FinalizeValidationError) {
          setMissingItemsList(e.missingItems);
          setShowMissingItems(true);
          return;
        }
        toast.error(e instanceof Error ? e.message : 'Failed to finalize checklist');
      },
    });
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
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !response || !response.form) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/nurse/ward-prep`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Ward List
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
    <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-in fade-in duration-500">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/nurse/ward-prep`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Ward List
          </Link>
        </Button>
      </div>

      <PaperHeaderSection
        caseId={caseId}
        patient={patient}
        surgeonName={response.surgeonName}
        anaesthesiologistName={response.anaesthesiologistName || null}
        headerDate={formData.header?.date}
        nursingComments={formData.header?.nursingComments}
        onHeaderChange={(next) => handleChange({ ...formData, header: next })}
        disabled={isDisabled}
        isFinalized={isFinalized}
        isAmendment={isAmendment}
        progress={paperHeaderProgress}
        onStartAmendment={() => setShowAmendDialog(true)}
      />

      {!isFinalized || isAmendment ? (
        <WardChecklistActionsHeader
          showActions={isAmendment || !isFinalized}
          isDirty={isDirty}
          isSaving={saveMutation.isPending}
          onSave={handleSave}
          onFinalize={() => setShowFinalizeDialog(true)}
        />
      ) : null}

      {/* Sections */}
      {isFinalized && !isAmendment ? (
        <FinalizedChecklistDocument
          patient={patient}
          surgeonName={response.surgeonName}
          anaesthesiologistName={response.anaesthesiologistName || null}
          data={formData}
        />
      ) : (
        <div className="space-y-6">
          {CHECKLIST_SECTIONS.map((section) => {
            const SectionRenderer = SECTION_RENDERERS[section.key as string];
            const sectionComplete = sectionCompletion[section.key as string]?.complete ?? false;
            return (
              <Card key={section.key} className="overflow-hidden">
                <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{section.title}</span>
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
                </div>
                <CardContent className="p-5">
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
        isPending={finalizeMutation.isPending}
      />

      <MissingItemsDialog open={showMissingItems} onOpenChange={setShowMissingItems} items={missingItemsList} />

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
  );
}
