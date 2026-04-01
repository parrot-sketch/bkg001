'use client';

/**
 * Nurse Intra-Operative Record Page
 *
 * Thin shell: state management, section rendering, dialog control.
 * All section components, config, and dialogs are extracted.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    useIntraOpRecord, useSaveIntraOpRecord, useFinalizeIntraOpRecord,
    IntraOpFinalizeValidationError,
} from '@/hooks/nurse/useIntraOpRecord';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { INTRAOP_SECTIONS } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Circle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { OperativeTimelinePanel } from '@/components/nurse/OperativeTimelinePanel';
import { SECTION_ICONS, SECTION_RENDERERS } from '@/components/nurse/intra-op-record/intraOpRecordConfig';
import { IntraOpRecordHeader } from '@/components/nurse/intra-op-record/IntraOpRecordHeader';
import { FinalizeDialog, MissingItemsDialog } from '@/components/nurse/intra-op-record/IntraOpRecordDialogs';

export default function NurseIntraOpRecordPage() {
    const params = useParams();
    const { user, isAuthenticated } = useAuth();
    const caseId = params?.caseId as string;

    const { data: response, isLoading, error } = useIntraOpRecord(caseId);
    const saveMutation = useSaveIntraOpRecord(caseId);
    const finalizeMutation = useFinalizeIntraOpRecord(caseId);

    const [formData, setFormData] = useState<NurseIntraOpRecordDraft>({
        patient: {}, entry: {}, safety: {}, timings: {}, diagnoses: {},
        positioning: {}, catheter: {}, skinPrep: {}, surgicalDetails: {},
        equipment: { electrosurgical: {}, tourniquet: {} }, staffing: {},
        counts: { items: [] }, closure: {}, fluids: {},
        medications: [], implants: [], specimens: [],
        itemsToReturn: [], billing: { anaestheticMaterialsCharge: '', theatreFee: '', items: [] },
    });
    const [isDirty, setIsDirty] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [showMissingItems, setShowMissingItems] = useState(false);
    const [missingItemsList, setMissingItemsList] = useState<string[]>([]);

    // Initialize from server
    useEffect(() => {
        if (response?.form?.data) {
            setFormData(response.form.data);
            setIsDirty(false);
        }
        if (response?.patient && response.form?.data) {
            const cp = response.form.data.patient || {};
            if (!cp.patientFileNo && !cp.patientName) {
                setFormData(prev => ({
                    ...prev,
                    patient: {
                        ...prev.patient,
                        patientFileNo: response.patient.file_number || '',
                        patientName: `${response.patient.first_name} ${response.patient.last_name}`.trim(),
                        doctor: response.surgeonName || '',
                        date: new Date().toISOString().split('T')[0],
                    }
                }));
                setIsDirty(true);
            }
        }
    }, [response?.form?.data, response?.patient]);

    const isFinalized = response?.form?.status === 'FINAL';
    const isDisabled = isFinalized || !isAuthenticated;
    const sectionCompletion = response?.form?.sectionCompletion ?? {};

    const handleFinalize = () => {
        finalizeMutation.mutate(undefined, {
            onSuccess: () => setShowFinalizeDialog(false),
            onError: (err) => {
                setShowFinalizeDialog(false);
                if (err instanceof IntraOpFinalizeValidationError) {
                    setMissingItemsList(err.missingItems);
                    setShowMissingItems(true);
                }
            },
        });
    };

    const handleFinalizeClick = () => {
        if (isDirty) {
            saveMutation.mutate(formData, {
                onSuccess: () => { setIsDirty(false); setShowFinalizeDialog(true); },
            });
        } else {
            setShowFinalizeDialog(true);
        }
    };

    // ── States ─────────────────────────────────────────────

    if (!isAuthenticated || !user) {
        return <div className="flex items-center justify-center h-[60vh]"><p className="text-muted-foreground">Please log in.</p></div>;
    }

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !response) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Card><CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{(error as Error)?.message || 'Failed to load record'}</p>
                </CardContent></Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-16">
            {/* Header */}
            <IntraOpRecordHeader
                caseId={caseId}
                patient={response.patient}
                procedureName={response.procedureName}
                side={response.side}
                surgeonName={response.surgeonName}
                caseStatus={response.caseStatus}
                isFinalized={isFinalized}
                isDirty={isDirty}
                isSaving={saveMutation.isPending}
                isFinalizing={finalizeMutation.isPending}
                hasDiscrepancy={formData.counts?.countCorrect === false}
                sectionCompletion={sectionCompletion}
                formSignedAt={response.form?.signedAt}
                onSave={() => saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) })}
                onFinalize={handleFinalizeClick}
            />

            {/* Timeline */}
            <OperativeTimelinePanel caseId={caseId} userRole={user?.role || ''} />

            {/* Sections */}
            <div className="grid grid-cols-1 gap-4">
                {INTRAOP_SECTIONS.map((section) => {
                    const Renderer = SECTION_RENDERERS[section.key];
                    const Icon = SECTION_ICONS[section.key] || Circle;
                    const completion = sectionCompletion[section.key];
                    const isComplete = completion?.complete ?? false;

                    if (!Renderer) return null;

                    return (
                        <Card key={section.key} className={`overflow-hidden ${section.isCritical ? 'border-amber-300 border-l-4' : isComplete ? 'border-emerald-200 border-l-4 border-l-emerald-400' : 'border-slate-200'}`}>
                            <CardHeader className="py-3 px-4 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isComplete ? 'bg-emerald-100 text-emerald-600' : section.isCritical ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                                        </div>
                                        <CardTitle className="text-sm font-semibold text-slate-800">{section.title}</CardTitle>
                                        {section.isCritical && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Required</span>}
                                    </div>
                                    <span className={`text-xs ${isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {isComplete ? 'Complete' : 'In Progress'}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 pb-6">
                                <Renderer
                                    data={formData}
                                    onChange={(d) => { setFormData(d); setIsDirty(true); }}
                                    disabled={isDisabled}
                                    caseId={caseId}
                                    patient={response.patient}
                                    surgeonName={response.surgeonName}
                                    formResponseId={response.form?.id}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Bottom bar */}
            {!isFinalized && (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t py-3 px-4 -mx-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{isDirty ? 'Unsaved changes' : 'Saved'}</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) })} disabled={saveMutation.isPending || !isDirty}>
                            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Save Draft
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinalizeClick} disabled={finalizeMutation.isPending}>
                            Finalize
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <FinalizeDialog
                open={showFinalizeDialog}
                onOpenChange={setShowFinalizeDialog}
                onConfirm={handleFinalize}
                isPending={finalizeMutation.isPending}
                hasDiscrepancy={formData.counts?.countCorrect === false}
            />
            <MissingItemsDialog
                open={showMissingItems}
                onOpenChange={setShowMissingItems}
                items={missingItemsList}
            />
        </div>
    );
}
