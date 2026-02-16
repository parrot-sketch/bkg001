'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseFormsApi } from '@/lib/api/nurse-forms';
import { MedicationAdministrationList } from './MedicationAdministrationList';
import {
    NursePreopWardChecklistData,
    NursePreopWardChecklistDraft,
    CHECKLIST_SECTIONS,
    ChecklistSectionMeta
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Save, CheckCircle2, AlertCircle, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicalFormStatus } from '@prisma/client';

interface NursePreOpChecklistProps {
    caseId: string;
    onClose?: () => void;
}

export function NursePreOpChecklist({ caseId, onClose }: NursePreOpChecklistProps) {
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState<string>(CHECKLIST_SECTIONS[0].key);
    const [localDraft, setLocalDraft] = useState<NursePreopWardChecklistDraft | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch form data
    const { data: formRes, isLoading, refetch } = useQuery({
        queryKey: ['nurse', 'forms', 'preop-ward', caseId],
        queryFn: async () => {
            const res = await nurseFormsApi.getPreopWardChecklist(caseId);
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
    });

    // Initialize local draft when data loads
    useEffect(() => {
        if (formRes?.form?.data) {
            setLocalDraft(formRes.form.data);
        }
    }, [formRes]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data: NursePreopWardChecklistDraft) => {
            setIsSaving(true);
            const res = await nurseFormsApi.savePreopWardChecklist(caseId, data);
            setIsSaving(false);
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['nurse', 'forms', 'preop-ward', caseId], (old: any) => ({
                ...old,
                form: data,
            }));
            toast.success('Draft saved');
        },
        onError: (error) => {
            toast.error('Failed to save draft');
            setIsSaving(false);
        },
    });

    // Finalize mutation
    const finalizeMutation = useMutation({
        mutationFn: async () => {
            const res = await nurseFormsApi.finalizePreopWardChecklist(caseId);
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Checklist finalized successfully');
            queryClient.invalidateQueries({ queryKey: ['nurse', 'pre-op', 'detail', caseId] });
            refetch();
            if (onClose) onClose();
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to finalize checklist');
        },
    });

    const handleFieldChange = useCallback((section: keyof NursePreopWardChecklistDraft, field: string, value: any) => {
        setLocalDraft((prev) => {
            if (!prev) return null;
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value,
                },
            };
        });
    }, []);

    // Debounced save could be implemented here, but for now we'll rely on manual "Save Draft" or save on section change?
    // Let's implement a manual "Save" button for clarity, or auto-save on blur. 
    // For simplicity in this iteration, we'll use a manual Save button at the bottom, 
    // but update local state immediately.

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
    }

    if (!localDraft || !formRes?.form) {
        return <div className="p-4 text-rose-500">Failed to load form data</div>;
    }

    const isFinalized = formRes.form.status === ClinicalFormStatus.FINAL;

    const renderField = (section: string, field: string, label: string, type: 'checkbox' | 'text' | 'time' | 'number' = 'text', placeholder = '') => {
        const sectionData = (localDraft as any)[section] || {};
        const value = sectionData[field];

        if (type === 'checkbox') {
            return (
                <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                        id={`${section}-${field}`}
                        checked={!!value}
                        onCheckedChange={(checked) => handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, checked)}
                        disabled={isFinalized}
                    />
                    <Label htmlFor={`${section}-${field}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </Label>
                </div>
            );
        }

        return (
            <div className="space-y-1 py-2">
                <Label htmlFor={`${section}-${field}`} className="text-sm font-medium text-slate-700">{label}</Label>
                <Input
                    id={`${section}-${field}`}
                    type={type}
                    value={value || ''}
                    onChange={(e) => {
                        const val = type === 'number' ? parseFloat(e.target.value) : e.target.value;
                        handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, val);
                    }}
                    placeholder={placeholder}
                    disabled={isFinalized}
                    className="bg-white"
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Pre-Operative Ward Checklist</h2>
                    <p className="text-sm text-slate-500">
                        {formRes.patient.first_name} {formRes.patient.last_name} ({formRes.patient.file_number})
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isFinalized ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Finalized
                        </div>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => saveMutation.mutate(localDraft)}
                                disabled={isSaving || saveMutation.isPending}
                                className="gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Draft
                            </Button>
                            <Button
                                onClick={() => finalizeMutation.mutate()}
                                disabled={finalizeMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                            >
                                <FileCheck className="w-4 h-4" />
                                Finalize
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-4 bg-slate-50/30">
                <div className="max-w-3xl mx-auto space-y-6 pb-10">

                    <Accordion type="single" collapsible value={activeSection} onValueChange={setActiveSection}>

                        {/* 1. DOCUMENTATION */}
                        <AccordionItem value="documentation" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.documentation?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Documentation</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                {renderField('documentation', 'documentationComplete', 'History/Physical Exam/Admission Notes Complete?', 'checkbox')}
                                {renderField('documentation', 'correctConsent', 'Consent form correct & signed?', 'checkbox')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 2. BLOOD RESULTS */}
                        <AccordionItem value="bloodResults" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.bloodResults?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Blood & Lab Results</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderField('bloodResults', 'hbPcv', 'Hb / PCV')}
                                    {renderField('bloodResults', 'uecs', 'U&ECs / Others')}
                                </div>
                                {renderField('bloodResults', 'xMatchUnitsAvailable', 'X-Match (Units Available)', 'number')}
                                {renderField('bloodResults', 'otherLabResults', 'Other Results')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 3. MEDICATIONS */}
                        <AccordionItem value="medications" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.medications?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Medications</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                <MedicationAdministrationList
                                    caseId={caseId}
                                    patient={formRes.patient}
                                    formResponseId={formRes.form.id}
                                    readOnly={isFinalized}
                                />

                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">Additional Medication Flags</p>
                                    {renderField('medications', 'preMedGiven', 'Pre-medication confirmed given?', 'checkbox')}
                                    {renderField('medications', 'periOpMedsGiven', 'Peri-operative meds confirmed given?', 'checkbox')}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 4. ALLERGIES & NPO */}
                        <AccordionItem value="allergiesNpo" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.allergiesNpo?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Allergies & NPO Status</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                {renderField('allergiesNpo', 'allergiesDocumented', 'Allergies Checked & Documented?', 'checkbox')}
                                {renderField('allergiesNpo', 'allergiesDetails', 'Allergy Details')}
                                {renderField('allergiesNpo', 'npoStatus', 'Patient is NPO?', 'checkbox')}
                                {localDraft.allergiesNpo?.npoStatus && renderField('allergiesNpo', 'npoFastedFromTime', 'Fasted From (HH:MM)', 'time')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 5. PREPARATION */}
                        <AccordionItem value="preparation" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.preparation?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Patient Preparation</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                {renderField('preparation', 'bathGown', 'Patient bathed & in theatre gown?', 'checkbox')}
                                {renderField('preparation', 'shaveSkinPrep', 'Shave / Skin Prep done?', 'checkbox')}
                                {renderField('preparation', 'idBandOn', 'ID Band confirmed correct?', 'checkbox')}
                                {renderField('preparation', 'makeupNailPolishRemoved', 'Makeup / Nail Polish removed?', 'checkbox')}
                                {renderField('preparation', 'jewelryRemoved', 'Jewelry removed (or taped)?', 'checkbox')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 6. VITALS */}
                        <AccordionItem value="vitals" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.vitals?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Vitals & Observations</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderField('vitals', 'bpSystolic', 'BP Systolic', 'number')}
                                    {renderField('vitals', 'bpDiastolic', 'BP Diastolic', 'number')}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderField('vitals', 'pulse', 'Pulse (bpm)', 'number')}
                                    {renderField('vitals', 'respiratoryRate', 'Resp Rate', 'number')}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderField('vitals', 'temperature', 'Temp (°C)', 'number')}
                                    {renderField('vitals', 'weight', 'Weight (kg)', 'number')}
                                </div>
                                {renderField('vitals', 'bladderEmptied', 'Bladder Emptied?', 'checkbox')}
                                {renderField('vitals', 'urinalysis', 'Urinalysis Result')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 7. PROSTHETICS */}
                        <AccordionItem value="prosthetics" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.prosthetics?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Prosthetics & Implants</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                {renderField('prosthetics', 'denturesRemoved', 'Dentures Removed?', 'checkbox')}
                                {renderField('prosthetics', 'contactLensRemoved', 'Contact Lenses Removed?', 'checkbox')}
                                {renderField('prosthetics', 'hearingAidRemoved', 'Hearing Aids Removed?', 'checkbox')}
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>

                    {!isFinalized && (
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => saveMutation.mutate(localDraft)}>Save Progress</Button>
                        </div>
                    )}

                </div>
            </ScrollArea>
        </div>
    );
}
