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
import { Loader2, Save, CheckCircle2, AlertCircle, FileCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicalFormStatus } from '@prisma/client';

interface NursePreOpChecklistProps {
    caseId: string;
    onClose?: () => void;
}

// ─── Option types ────────────────────────────────────────────────────────────

type LabStatus = 'Normal' | 'Low' | 'High' | 'Abnormal' | 'Not Done' | 'Pending';
type UrinalysisStatus = 'Normal' | 'Abnormal' | 'Trace' | 'Not Done' | 'N/A';

const LAB_STATUS_OPTIONS: { value: LabStatus; label: string; color: string }[] = [
    { value: 'Normal', label: 'Normal', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' },
    { value: 'Low', label: 'Low', color: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' },
    { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200' },
    { value: 'Abnormal', label: 'Abnormal', color: 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200' },
    { value: 'Pending', label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' },
    { value: 'Not Done', label: 'Not Done', color: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200' },
];

const URINALYSIS_OPTIONS: { value: UrinalysisStatus; label: string; color: string }[] = [
    { value: 'Normal', label: 'Normal', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' },
    { value: 'Trace', label: 'Trace', color: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' },
    { value: 'Abnormal', label: 'Abnormal', color: 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200' },
    { value: 'Not Done', label: 'Not Done', color: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200' },
    { value: 'N/A', label: 'N/A', color: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200' },
];

const COMMON_ALLERGENS = [
    'Penicillin', 'Sulfa drugs', 'NSAIDs', 'Aspirin', 'Latex',
    'Iodine / Betadine', 'Morphine', 'Codeine', 'Contrast dye', 'Pollen',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Pill-style radio selector */
function StatusSelector<T extends string>({
    label,
    value,
    options,
    onChange,
    disabled,
}: {
    label: string;
    value: T | undefined;
    options: { value: T; label: string; color: string }[];
    onChange: (v: T) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2 py-2">
            <Label className="text-sm font-medium text-slate-700">{label}</Label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            opt.color,
                            value === opt.value
                                ? 'ring-2 ring-offset-1 ring-current shadow-sm scale-105'
                                : 'opacity-70',
                            disabled && 'cursor-not-allowed opacity-50'
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Allergen quick-pick chips + free-text input */
function AllergyInput({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const selected = value
        ? value.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const toggle = (allergen: string) => {
        if (disabled) return;
        const next = selected.includes(allergen)
            ? selected.filter((a) => a !== allergen)
            : [...selected, allergen];
        onChange(next.join(', '));
    };

    const removeChip = (allergen: string) => {
        if (disabled) return;
        onChange(selected.filter((a) => a !== allergen).join(', '));
    };

    return (
        <div className="space-y-3 py-2">
            <Label className="text-sm font-medium text-slate-700">Allergy Details</Label>

            {/* Quick-pick chips */}
            <div>
                <p className="text-xs text-slate-400 mb-2">Quick-add common allergens:</p>
                <div className="flex flex-wrap gap-1.5">
                    {COMMON_ALLERGENS.map((a) => (
                        <button
                            key={a}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggle(a)}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-xs border transition-all',
                                selected.includes(a)
                                    ? 'bg-rose-100 text-rose-700 border-rose-300 font-medium'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                        >
                            {selected.includes(a) ? '✓ ' : '+ '}{a}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected chips display */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((a) => (
                        <span
                            key={a}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-medium"
                        >
                            {a}
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removeChip(a)}
                                    className="hover:text-rose-900"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Free-text for anything not in the list */}
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Or type custom allergy details…"
                disabled={disabled}
                className="bg-white text-sm"
            />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
        onError: () => {
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

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
    }

    if (!localDraft || !formRes?.form) {
        return <div className="p-4 text-rose-500">Failed to load form data</div>;
    }

    const isFinalized = formRes.form.status === ClinicalFormStatus.FINAL;

    // ── Generic field renderers ──────────────────────────────────────────────

    const renderCheckbox = (section: string, field: string, label: string) => {
        const value = (localDraft as any)[section]?.[field];
        return (
            <div className="flex items-center space-x-2 py-2">
                <Checkbox
                    id={`${section}-${field}`}
                    checked={!!value}
                    onCheckedChange={(checked) =>
                        handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, checked)
                    }
                    disabled={isFinalized}
                />
                <Label
                    htmlFor={`${section}-${field}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {label}
                </Label>
            </div>
        );
    };

    const renderInput = (
        section: string,
        field: string,
        label: string,
        type: 'text' | 'time' | 'number' = 'text',
        placeholder = ''
    ) => {
        const value = (localDraft as any)[section]?.[field];
        return (
            <div className="space-y-1 py-2">
                <Label htmlFor={`${section}-${field}`} className="text-sm font-medium text-slate-700">
                    {label}
                </Label>
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

    const renderTextarea = (section: string, field: string, label: string, placeholder = '') => {
        const value = (localDraft as any)[section]?.[field];
        return (
            <div className="space-y-1 py-2">
                <Label className="text-sm font-medium text-slate-700">{label}</Label>
                <Textarea
                    value={value || ''}
                    onChange={(e) =>
                        handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, e.target.value)
                    }
                    placeholder={placeholder}
                    disabled={isFinalized}
                    className="bg-white text-sm resize-none"
                    rows={2}
                />
            </div>
        );
    };

    const renderLabStatus = (section: string, field: string, label: string) => {
        const value = (localDraft as any)[section]?.[field];
        return (
            <StatusSelector
                label={label}
                value={value as LabStatus}
                options={LAB_STATUS_OPTIONS}
                onChange={(v) => handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, v)}
                disabled={isFinalized}
            />
        );
    };

    const renderUrinalysis = (section: string, field: string) => {
        const value = (localDraft as any)[section]?.[field];
        return (
            <StatusSelector
                label="Urinalysis Result"
                value={value as UrinalysisStatus}
                options={URINALYSIS_OPTIONS}
                onChange={(v) => handleFieldChange(section as keyof NursePreopWardChecklistDraft, field, v)}
                disabled={isFinalized}
            />
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────

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
                            <AccordionContent className="pt-2 pb-4 space-y-1">
                                {renderCheckbox('documentation', 'documentationComplete', 'History / Physical Exam / Admission Notes complete?')}
                                {renderCheckbox('documentation', 'correctConsent', 'Consent form correct & signed?')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 2. BLOOD & LAB RESULTS */}
                        <AccordionItem value="bloodResults" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.bloodResults?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Blood & Lab Results</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                    {renderLabStatus('bloodResults', 'hbPcv', 'Hb / PCV')}
                                    {renderLabStatus('bloodResults', 'uecs', 'U&ECs / Others')}
                                </div>

                                <div className="space-y-1 py-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        X-Match — Units Available
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                disabled={isFinalized}
                                                onClick={() =>
                                                    handleFieldChange('bloodResults', 'xMatchUnitsAvailable', n)
                                                }
                                                className={cn(
                                                    'w-9 h-9 rounded-full border text-sm font-medium transition-all',
                                                    localDraft.bloodResults?.xMatchUnitsAvailable === n
                                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm scale-110'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                                                    isFinalized && 'cursor-not-allowed opacity-50'
                                                )}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <span className="text-xs text-slate-400">units</span>
                                    </div>
                                </div>

                                {renderTextarea('bloodResults', 'otherLabResults', 'Other Lab Results / Notes', 'e.g. Coagulation, LFTs, ECG findings…')}
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
                                    <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">
                                        Additional Medication Flags
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                        {renderCheckbox('medications', 'preMedGiven', 'Pre-medication confirmed given?')}
                                        {renderCheckbox('medications', 'periOpMedsGiven', 'Peri-operative meds confirmed given?')}
                                        {renderCheckbox('medications', 'regularMedsConfirmed', 'Regular medications confirmed?')}
                                    </div>
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
                            <AccordionContent className="pt-2 pb-4 space-y-2">
                                {renderCheckbox('allergiesNpo', 'allergiesDocumented', 'Allergies checked & documented?')}

                                <AllergyInput
                                    value={localDraft.allergiesNpo?.allergiesDetails || ''}
                                    onChange={(v) => handleFieldChange('allergiesNpo', 'allergiesDetails', v)}
                                    disabled={isFinalized}
                                />

                                {renderCheckbox('allergiesNpo', 'npoStatus', 'Patient is nil by mouth (NPO)?')}

                                {localDraft.allergiesNpo?.npoStatus && (
                                    <div className="pl-6 border-l-2 border-slate-200 ml-1">
                                        {renderInput('allergiesNpo', 'npoFastedFromTime', 'Fasted from (time)', 'time')}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 5. PATIENT PREPARATION */}
                        <AccordionItem value="preparation" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.preparation?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Patient Preparation</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                    {renderCheckbox('preparation', 'bathGown', 'Patient bathed & in theatre gown?')}
                                    {renderCheckbox('preparation', 'shaveSkinPrep', 'Shave / skin prep done?')}
                                    {renderCheckbox('preparation', 'idBandOn', 'ID band confirmed correct?')}
                                    {renderCheckbox('preparation', 'makeupNailPolishRemoved', 'Makeup / nail polish removed?')}
                                    {renderCheckbox('preparation', 'jewelryRemoved', 'Jewelry removed (or taped)?')}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 6. VITALS & OBSERVATIONS */}
                        <AccordionItem value="vitals" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.vitals?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Vitals & Observations</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                {/* Blood Pressure */}
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Blood Pressure (mmHg)</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput('vitals', 'bpSystolic', 'Systolic', 'number', '120')}
                                        {renderInput('vitals', 'bpDiastolic', 'Diastolic', 'number', '80')}
                                    </div>
                                </div>

                                {/* Other numeric vitals */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {renderInput('vitals', 'pulse', 'Pulse (bpm)', 'number', '72')}
                                    {renderInput('vitals', 'respiratoryRate', 'Resp. Rate (/min)', 'number', '16')}
                                    {renderInput('vitals', 'temperature', 'Temp (°C)', 'number', '36.5')}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput('vitals', 'weight', 'Weight (kg)', 'number')}
                                    {renderInput('vitals', 'height', 'Height (cm)', 'number')}
                                </div>

                                {renderCheckbox('vitals', 'bladderEmptied', 'Bladder emptied?')}

                                {/* Urinalysis — pill selector */}
                                {renderUrinalysis('vitals', 'urinalysis')}

                                {renderTextarea('vitals', 'otherNotes', 'Other observations / notes', 'Any additional pre-op observations…')}
                            </AccordionContent>
                        </AccordionItem>

                        {/* 7. PROSTHETICS & IMPLANTS */}
                        <AccordionItem value="prosthetics" className="border rounded-lg bg-white mb-4 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", formRes.form.sectionCompletion.prosthetics?.complete ? "bg-emerald-500" : "bg-amber-500")} />
                                    <span>Prosthetics & Implants</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                    {renderCheckbox('prosthetics', 'denturesRemoved', 'Dentures removed?')}
                                    {renderCheckbox('prosthetics', 'contactLensRemoved', 'Contact lenses removed?')}
                                    {renderCheckbox('prosthetics', 'hearingAidRemoved', 'Hearing aids removed?')}
                                    {renderCheckbox('prosthetics', 'crownsNoted', 'Crowns / bridgework noted?')}
                                </div>
                                {renderTextarea('prosthetics', 'prostheticNotes', 'Prosthetic notes', 'Any notes about prosthetics or implants…')}
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
