'use client';

/**
 * Nurse Pre-Operative Ward Checklist Page
 *
 * Full-page clinical form for the NSAC perioperative pre-op ward checklist.
 * Sections: Documentation, Labs, Medications, Allergies/NPO, Preparation,
 * Prosthetics, Vitals/Observations, Handover.
 *
 * Features:
 * - Explicit save (nurse clicks "Save Draft")
 * - Section-level completion indicators
 * - "Finalize Checklist" with validation
 * - Locked read-only view after finalization
 * - Structured skin prep agent/area dropdowns
 * - SpO₂ field with soft warning badges
 * - Urinalysis enum dropdown with custom fallback
 * - Improved navigation with Back to Ward List
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    usePreopWardChecklist,
    useSavePreopWardChecklist,
    useFinalizePreopWardChecklist,
    FinalizeValidationError,
} from '@/hooks/nurse/usePreopWardChecklist';
import type { NursePreopWardChecklistDraft } from '@/domain/clinical-forms/NursePreopWardChecklist';
import {
    CHECKLIST_SECTIONS,
    SkinPrepAgent,
    SkinPrepArea,
    UrinalysisResult,
    SKIN_PREP_AGENT_LABELS,
    SKIN_PREP_AREA_LABELS,
    URINALYSIS_LABELS,
    normalizeLegacyChecklistData,
    HB_PCV_OPTIONS,
    UECS_OPTIONS,
    HB_PCV_LABELS,
    UECS_LABELS,
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import type { UrinalysisValue } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { getVitalsWarningMap } from '@/domain/helpers/vitalsWarnings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Save,
    Lock,
    Loader2,
    CheckCircle2,
    Circle,
    AlertTriangle,
    FileCheck,
    TestTube2,
    Pill,
    Scissors,
    Eye,
    Activity,
    ArrowRightLeft,
    User2,
    ShieldAlert,
    ClipboardCheck,
    Printer,
    AlertCircle,
    FilePen,
    Clock,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { MedicationAdministrationList } from '@/components/nurse/MedicationAdministrationList';
import { HandoverSection } from '@/components/nurse/ward-prep-checklist/sections';


// ──────────────────────────────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
    FileCheck,
    TestTube: TestTube2,
    Pill,
    AlertTriangle,
    Scissors,
    Eye,
    Activity,
    ArrowRightLeft,
};

// ──────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────

function formatDoctorName(name: string | null | undefined): string {
    if (!name) return '';
    return name.match(/^(Dr\.?|Dr\s)/i) ? name : `Dr. ${name}`;
}

// ──────────────────────────────────────────────────────────────────────
// Field Components (generic, data-driven)
// ──────────────────────────────────────────────────────────────────────

function BooleanField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: boolean | undefined;
    onChange: (v: boolean) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex items-center gap-3 py-1.5">
            <Checkbox
                checked={!!value}
                onCheckedChange={(checked) => onChange(checked === true)}
                disabled={disabled}
                id={label}
            />
            <Label htmlFor={label} className="text-sm font-normal cursor-pointer">
                {label}
            </Label>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || label}
                disabled={disabled}
                className="h-9"
            />
        </div>
    );
}

function TimeField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                    type="time"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="h-9 pl-10 pr-3 max-w-[160px] font-mono"
                />
            </div>
        </div>
    );
}

function NumberField({
    label,
    value,
    onChange,
    min,
    max,
    step,
    unit,
    disabled,
    warning,
}: {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled: boolean;
    warning?: { message: string; severity: 'warning' | 'critical' };
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">
                {label} {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
            </Label>
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    min={min}
                    max={max}
                    step={step || 1}
                    disabled={disabled}
                    className={`h-9 max-w-[150px] ${warning
                        ? warning.severity === 'critical'
                            ? 'border-red-400 focus-visible:ring-red-400'
                            : 'border-amber-400 focus-visible:ring-amber-400'
                        : ''
                        }`}
                />
                {warning && (
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-medium ${warning.severity === 'critical'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {warning.message}
                    </div>
                )}
            </div>
        </div>
    );
}

function SelectField<T extends string>({
    label,
    value,
    onChange,
    options,
    disabled,
    placeholder,
}: {
    label: string;
    value: T | undefined;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    disabled: boolean;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Select
                value={value ?? ''}
                onValueChange={(v) => onChange(v as T)}
                disabled={disabled}
            >
                <SelectTrigger className="h-9 w-full max-w-[260px]">
                    <SelectValue placeholder={placeholder ?? `Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function SelectOrCustomField({
    label,
    value,
    onChange,
    options,
    disabled,
}: {
    label: string;
    value: UrinalysisValue | undefined;
    onChange: (v: UrinalysisValue | undefined) => void;
    options: { value: UrinalysisResult; label: string }[];
    disabled: boolean;
}) {
    const NONE_VALUE = '__none__';
    const currentEnum = value === undefined
        ? NONE_VALUE
        : typeof value === 'string'
            ? value
            : UrinalysisResult.OTHER;

    const customText = value && typeof value === 'object' ? value.custom : '';

    return (
        <div className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <div className="flex flex-wrap items-start gap-3">
                <Select
                    value={currentEnum}
                    onValueChange={(v) => {
                        if (v === NONE_VALUE || v === '') {
                            onChange(undefined);
                        } else if (v === UrinalysisResult.OTHER) {
                            onChange({ custom: customText });
                        } else {
                            onChange(v as UrinalysisResult);
                        }
                    }}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9 w-[220px]">
                        <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
                        {options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {currentEnum === UrinalysisResult.OTHER && (
                    <Input
                        className="h-9 flex-1 min-w-[160px]"
                        placeholder="Specify result..."
                        value={customText}
                        disabled={disabled}
                        onChange={(e) => onChange({ custom: e.target.value })}
                    />
                )}
            </div>
        </div>
    );
}

function SkinPrepSubSection({
    value,
    onChange,
    disabled,
    defaultPerformerName,
}: {
    value: {
        agent?: SkinPrepAgent;
        area?: SkinPrepArea;
        agentOther?: string;
        areaOther?: string;
        performerName?: string;
    } | undefined;
    onChange: (v: NonNullable<typeof value>) => void;
    disabled: boolean;
    defaultPerformerName?: string;
}) {
    const sp = value ?? {};
    const set = (field: string, val: unknown) => onChange({ ...sp, [field]: val });

    const agentOptions = Object.values(SkinPrepAgent).map((a) => ({
        value: a,
        label: SKIN_PREP_AGENT_LABELS[a],
    }));

    const areaOptions = Object.values(SkinPrepArea).map((a) => ({
        value: a,
        label: SKIN_PREP_AREA_LABELS[a],
    }));

    return (
        <div className="ml-7 mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skin Prep Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField<SkinPrepAgent>
                    label="Prep Agent"
                    value={sp.agent}
                    onChange={(v) => set('agent', v)}
                    options={agentOptions}
                    disabled={disabled}
                    placeholder="Select agent"
                />
                {sp.agent === SkinPrepAgent.OTHER && (
                    <TextField
                        label="Agent (specify)"
                        value={sp.agentOther}
                        onChange={(v) => set('agentOther', v)}
                        placeholder="e.g. Chlorhexidine 2%"
                        disabled={disabled}
                    />
                )}

                <SelectField<SkinPrepArea>
                    label="Prep Area"
                    value={sp.area}
                    onChange={(v) => set('area', v)}
                    options={areaOptions}
                    disabled={disabled}
                    placeholder="Select area"
                />
                {sp.area === SkinPrepArea.OTHER && (
                    <TextField
                        label="Area (specify)"
                        value={sp.areaOther}
                        onChange={(v) => set('areaOther', v)}
                        placeholder="e.g. Shoulder"
                        disabled={disabled}
                    />
                )}

                <TextField
                    label="Performed by (name)"
                    value={sp.performerName || defaultPerformerName || ''}
                    onChange={(v) => set('performerName', v)}
                    placeholder={defaultPerformerName || "Nurse / tech name"}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}


// ──────────────────────────────────────────────────────────────────────
// Section Renderers
// ──────────────────────────────────────────────────────────────────────

function DocumentationSection({ data, onChange, disabled }: SectionProps) {
    const d = data.documentation ?? {};
    const set = (field: string, value: any) => onChange({ ...data, documentation: { ...d, [field]: value } });
    return (
        <div className="space-y-3">
            <BooleanField label="Documentation complete and correct" value={d.documentationComplete} onChange={(v) => set('documentationComplete', v)} disabled={disabled} />
            <BooleanField label="Correct consent signed" value={d.correctConsent} onChange={(v) => set('correctConsent', v)} disabled={disabled} />
        </div>
    );
}

function BloodResultsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.bloodResults ?? {};
    const set = (field: string, value: any) => onChange({ ...data, bloodResults: { ...d, [field]: value } });

    const NONE_VALUE = '__none__';
    const hbPcvValue = d.hbPcv || NONE_VALUE;
    const uecsValue = d.uecs || NONE_VALUE;
    const showHbPcvNotes = hbPcvValue !== '' && hbPcvValue !== NONE_VALUE && hbPcvValue !== 'normal' && hbPcvValue !== 'not_done';
    const showUecsNotes = uecsValue !== '' && uecsValue !== NONE_VALUE && uecsValue !== 'normal' && uecsValue !== 'not_done';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Hb / PCV</Label>
                    <Select value={hbPcvValue} onValueChange={(v) => set('hbPcv', v === NONE_VALUE ? '' : v)} disabled={disabled}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select result" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
                            {HB_PCV_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                            <SelectItem value="__custom__">Other (specify)</SelectItem>
                        </SelectContent>
                    </Select>
                    {showHbPcvNotes && (<Input placeholder="Add notes..." value={d.hbPcvNotes || ''} onChange={(e) => set('hbPcvNotes', e.target.value)} disabled={disabled} className="h-8 mt-1" />)}
                    {hbPcvValue === '__custom__' && (<Input placeholder="Specify Hb/PCV value..." value={d.hbPcvNotes || ''} onChange={(e) => set('hbPcvNotes', e.target.value)} disabled={disabled} className="h-8 mt-1" />)}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">UECs</Label>
                    <Select value={uecsValue} onValueChange={(v) => set('uecs', v === NONE_VALUE ? '' : v)} disabled={disabled}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select result" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
                            {UECS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                            <SelectItem value="__custom__">Other (specify)</SelectItem>
                        </SelectContent>
                    </Select>
                    {showUecsNotes && (<Input placeholder="Add notes..." value={d.uecsNotes || ''} onChange={(e) => set('uecsNotes', e.target.value)} disabled={disabled} className="h-8 mt-1" />)}
                    {uecsValue === '__custom__' && (<Input placeholder="Specify UECs value..." value={d.uecsNotes || ''} onChange={(e) => set('uecsNotes', e.target.value)} disabled={disabled} className="h-8 mt-1" />)}
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField label="X-match units available" value={d.xMatchUnitsAvailable} onChange={(v) => set('xMatchUnitsAvailable', v)} min={0} disabled={disabled} />
                <TextField label="Other lab results / notes" value={d.otherLabResults} onChange={(v) => set('otherLabResults', v)} disabled={disabled} />
            </div>
        </div>
    );
}

function MedicationsSection({ data, onChange, disabled, caseId, patient, formResponseId }: SectionProps) {
    const d = data.medications ?? {};
    const set = (field: string, value: any) => onChange({ ...data, medications: { ...d, [field]: value } });
    return (
        <div className="space-y-6">
            <MedicationAdministrationList caseId={caseId} patient={patient} formResponseId={formResponseId} readOnly={disabled} />
            <Separator />
            <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Additional Medication Flags</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanField label="Pre-medication confirmed given?" value={d.preMedGiven} onChange={(v) => set('preMedGiven', v)} disabled={disabled} />
                    <BooleanField label="Peri-operative meds confirmed given?" value={d.periOpMedsGiven} onChange={(v) => set('periOpMedsGiven', v)} disabled={disabled} />
                    <BooleanField label="Regular medications confirmed given?" value={d.regularMedsGiven} onChange={(v) => set('regularMedsGiven', v)} disabled={disabled} />
                </div>
            </div>
        </div>
    );
}

function AllergiesNpoSection({ data, onChange, disabled, patientAllergies }: SectionProps) {
    const d = data.allergiesNpo ?? {};
    const set = (field: string, value: any) => onChange({ ...data, allergiesNpo: { ...d, [field]: value } });
    return (
        <div className="space-y-4">
            {patientAllergies && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg shadow-sm">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-700">KNOWN ALLERGIES - PATIENT RECORD</p>
                        <p className="text-base font-semibold text-red-800 mt-1">{patientAllergies}</p>
                    </div>
                </div>
            )}
            <BooleanField label="Allergies documented" value={d.allergiesDocumented} onChange={(v) => set('allergiesDocumented', v)} disabled={disabled} />
            <TextField label="Allergy details (list all)" value={d.allergiesDetails} onChange={(v) => set('allergiesDetails', v)} disabled={disabled} />
            <Separator />
            <BooleanField label="Patient is nil by mouth (NPO)" value={d.npoStatus} onChange={(v) => set('npoStatus', v)} disabled={disabled} />
            {d.npoStatus && (<div className="pl-7"><TimeField label="Fasted from (time)" value={d.npoFastedFromTime} onChange={(v) => set('npoFastedFromTime', v)} disabled={disabled} /></div>)}
        </div>
    );
}

function PreparationSection({ data, onChange, disabled, currentUser }: SectionProps) {
    const d = data.preparation ?? {};
    const set = (field: string, value: any) => onChange({ ...data, preparation: { ...d, [field]: value } });
    const showSkinPrepDetails = !!d.shaveSkinPrep || !!d.skinPrep;
    const userName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || '';
    return (
        <div className="space-y-3">
            <BooleanField label="Bath / shower and gown" value={d.bathGown} onChange={(v) => set('bathGown', v)} disabled={disabled} />
            <BooleanField label="Shave / skin prep done" value={d.shaveSkinPrep} onChange={(v) => set('shaveSkinPrep', v)} disabled={disabled} />
            {showSkinPrepDetails && (<SkinPrepSubSection value={d.skinPrep as any} onChange={(v) => set('skinPrep', v)} disabled={disabled} defaultPerformerName={userName} />)}
            <BooleanField label="ID band on" value={d.idBandOn} onChange={(v) => set('idBandOn', v)} disabled={disabled} />
            <BooleanField label="Correct positioning verified" value={d.correctPositioning} onChange={(v) => set('correctPositioning', v)} disabled={disabled} />
            <BooleanField label="Jewelry removed" value={d.jewelryRemoved} onChange={(v) => set('jewelryRemoved', v)} disabled={disabled} />
            <BooleanField label="Makeup / nail polish removed" value={d.makeupNailPolishRemoved} onChange={(v) => set('makeupNailPolishRemoved', v)} disabled={disabled} />
        </div>
    );
}

function ProstheticsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.prosthetics ?? {};
    const set = (field: string, value: any) => onChange({ ...data, prosthetics: { ...d, [field]: value } });
    return (
        <div className="space-y-3">
            <BooleanField label="Contact lenses removed" value={d.contactLensRemoved} onChange={(v) => set('contactLensRemoved', v)} disabled={disabled} />
            <BooleanField label="Dentures removed" value={d.denturesRemoved} onChange={(v) => set('denturesRemoved', v)} disabled={disabled} />
            <BooleanField label="Hearing aid removed" value={d.hearingAidRemoved} onChange={(v) => set('hearingAidRemoved', v)} disabled={disabled} />
            <BooleanField label="Crowns / bridgework noted" value={d.crownsBridgeworkNoted} onChange={(v) => set('crownsBridgeworkNoted', v)} disabled={disabled} />
            <TextField label="Prosthetic notes" value={d.prostheticNotes} onChange={(v) => set('prostheticNotes', v)} disabled={disabled} />
        </div>
    );
}

function VitalsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.vitals ?? {};
    const set = (field: string, value: any) => onChange({ ...data, vitals: { ...d, [field]: value } });
    const warningMap = getVitalsWarningMap({ bpSystolic: d.bpSystolic, bpDiastolic: d.bpDiastolic, pulse: d.pulse, respiratoryRate: d.respiratoryRate, temperature: d.temperature, spo2: d.spo2 });
    const urinalysisOptions = Object.values(UrinalysisResult).map((r) => ({ value: r, label: URINALYSIS_LABELS[r] }));
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="BP Systolic" value={d.bpSystolic} onChange={(v) => set('bpSystolic', v)} min={60} max={260} unit="mmHg" disabled={disabled} warning={warningMap.get('bpSystolic')} />
                <NumberField label="BP Diastolic" value={d.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} min={30} max={160} unit="mmHg" disabled={disabled} warning={warningMap.get('bpDiastolic')} />
                <NumberField label="Pulse" value={d.pulse} onChange={(v) => set('pulse', v)} min={30} max={220} unit="bpm" disabled={disabled} warning={warningMap.get('pulse')} />
                <NumberField label="Respiratory Rate" value={d.respiratoryRate} onChange={(v) => set('respiratoryRate', v)} min={6} max={120} unit="/min" disabled={disabled} warning={warningMap.get('respiratoryRate')} />
                <NumberField label="Temperature" value={d.temperature} onChange={(v) => set('temperature', v)} min={34} max={42} step={0.1} unit="°C" disabled={disabled} warning={warningMap.get('temperature')} />
                <NumberField label="SpO₂" value={d.spo2} onChange={(v) => set('spo2', v)} min={50} max={100} unit="%" disabled={disabled} warning={warningMap.get('spo2')} />
            </div>
            <Separator />
            <BooleanField label="Bladder emptied" value={d.bladderEmptied} onChange={(v) => set('bladderEmptied', v)} disabled={disabled} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="Height" value={d.height} onChange={(v) => set('height', v)} min={50} max={250} unit="cm" disabled={disabled} />
                <NumberField label="Weight" value={d.weight} onChange={(v) => set('weight', v)} min={2} max={350} unit="kg" disabled={disabled} />
            </div>
            <Separator />
            <SelectOrCustomField label="Urinalysis results" value={d.urinalysis as UrinalysisValue | undefined} onChange={(v) => set('urinalysis', v)} options={urinalysisOptions} disabled={disabled} />
            <TextField label="Other forms required / notes" value={d.otherFormsRequired} onChange={(v) => set('otherFormsRequired', v)} disabled={disabled} />
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

interface SectionProps {
    data: NursePreopWardChecklistDraft;
    onChange: (data: NursePreopWardChecklistDraft) => void;
    disabled: boolean;
    caseId: string;
    patient: any;
    formResponseId: string;
    patientAllergies?: string | null;
    currentUser?: { firstName?: string; lastName?: string; email?: string } | null;
}

const SECTION_RENDERERS: Record<string, React.FC<SectionProps>> = {
    documentation: DocumentationSection,
    bloodResults: BloodResultsSection,
    medications: MedicationsSection,
    allergiesNpo: AllergiesNpoSection,
    preparation: PreparationSection,
    prosthetics: ProstheticsSection,
    vitals: VitalsSection,
    handover: HandoverSection,
};

function SectionStatus({ complete, label }: { complete: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-sm">{label}</span>
            {complete ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">Complete</Badge>
            ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pending</Badge>
            )}
        </div>
    );
}

function SurgicalPlanReferencePanel({ casePlan }: { casePlan: any }) {
    if (!casePlan) return null;
    return (
        <Card className="border-indigo-200 bg-indigo-50/20">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-slate-800">Surgical Plan Reference</span>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    {casePlan.procedure_plan && (
                        <AccordionItem value="plan" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Procedure Plan</AccordionTrigger>
                            <AccordionContent><div className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100" dangerouslySetInnerHTML={{ __html: casePlan.procedure_plan }} /></AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.special_instructions && (
                        <AccordionItem value="instructions" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Special Instructions</AccordionTrigger>
                            <AccordionContent><div className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100" dangerouslySetInnerHTML={{ __html: casePlan.special_instructions }} /></AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.pre_op_notes && (
                        <AccordionItem value="notes" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Pre-op Notes</AccordionTrigger>
                            <AccordionContent><div className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100" dangerouslySetInnerHTML={{ __html: casePlan.pre_op_notes }} /></AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
                {casePlan.planned_anesthesia && (
                    <div className="pt-2 border-t border-indigo-100">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">Planned Anesthesia</p>
                        <p className="text-xs font-semibold text-slate-700">{casePlan.planned_anesthesia}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────

export default function NursePreopWardChecklistPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const caseId = params?.id as string;

    const { data: response, isLoading, error } = usePreopWardChecklist(caseId);
    const saveMutation = useSavePreopWardChecklist(caseId);
    const finalizeMutation = useFinalizePreopWardChecklist(caseId);

    const [formData, setFormData] = useState<NursePreopWardChecklistDraft>({
        documentation: {}, bloodResults: {}, medications: {}, allergiesNpo: {}, preparation: {}, prosthetics: {}, vitals: {}, handover: {},
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
        if (response?.form?.data) {
            const normalizedData = normalizeLegacyChecklistData(response.form.data);
            const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || '';
            if (userName) {
                normalizedData.handover = normalizedData.handover || {};
                if (!normalizedData.handover.preparedByName) normalizedData.handover.preparedByName = userName;
                if (!normalizedData.handover.handedOverByName) normalizedData.handover.handedOverByName = userName;
            }
            setFormData(normalizedData);
            setIsDirty(false);
        }
    }, [response?.form?.data, user]);

    const formStatus = response?.form?.status;
    const isFinalized = formStatus === 'FINAL';
    const isAmendment = formStatus === 'AMENDMENT';
    const isDisabled = isFinalized || !isAuthenticated;

    const handleStartAmendment = async () => {
        if (amendReason.trim().length < 10) { setAmendError('Please provide a reason of at least 10 characters.'); return; }
        setAmendError(''); setIsAmending(true);
        try {
            const res = await fetch(`/api/nurse/surgical-cases/${caseId}/forms/preop-ward/amend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: amendReason }) });
            const json = await res.json();
            if (!res.ok) setAmendError(json.error || 'Failed to start amendment.');
            else { setShowAmendDialog(false); setAmendReason(''); router.refresh(); }
        } catch { setAmendError('Network error. Please try again.'); } finally { setIsAmending(false); }
    };

    const handleChange = useCallback((newData: NursePreopWardChecklistDraft) => { setFormData(newData); setIsDirty(true); }, []);

    const handleSave = () => {
        const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || '';
        const dataToSave = { ...formData };
        if (userName) {
            dataToSave.handover = dataToSave.handover || {};
            if (!dataToSave.handover.preparedByName) dataToSave.handover.preparedByName = userName;
            if (!dataToSave.handover.handedOverByName) dataToSave.handover.handedOverByName = userName;
        }
        saveMutation.mutate(dataToSave, {
            onSuccess: () => { setIsDirty(false); toast.success('Checklist saved successfully'); },
            onError: () => { toast.error('Failed to save checklist'); },
        });
    };

    const handleFinalize = () => {
        finalizeMutation.mutate(undefined, {
            onSuccess: () => { setShowFinalizeDialog(false); router.push('/nurse/ward-prep'); },
            onError: (error) => { setShowFinalizeDialog(false); if (error instanceof FinalizeValidationError) { setMissingItemsList(error.missingItems); setShowMissingItems(true); } },
        });
    };

    const sectionCompletion = response?.form?.sectionCompletion ?? {};
    const completedSections = Object.values(sectionCompletion).filter((s: any) => s.complete).length;
    const totalSections = CHECKLIST_SECTIONS.length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    if (!isAuthenticated || !user) return (<div className="flex items-center justify-center h-[60vh]"><p className="text-muted-foreground">Please log in to access the checklist.</p></div>);
    if (isLoading) return (<div className="space-y-6 max-w-4xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>);
    if (error || !response || !response.form) return (<div className="space-y-6 max-w-4xl mx-auto"><Button variant="ghost" size="sm" asChild><Link href={`/nurse/ward-prep`}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Ward List</Link></Button><Card><CardContent className="p-8 text-center"><AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" /><h3 className="font-semibold text-lg mb-2">Failed to load checklist</h3><p className="text-muted-foreground">{(error as Error)?.message || 'Unknown error'}</p></CardContent></Card></div>);

    const patient = response.patient;
    const form = response.form;

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-in fade-in duration-500">
            {/* Navigation - IMPROVED */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/nurse/ward-prep`}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Ward List</Link>
                </Button>
                <span className="text-slate-300">|</span>
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/nurse/ward-prep/${caseId}`}><User2 className="w-4 h-4 mr-2" /> Case Details</Link>
                </Button>
            </div>

            {/* Patient Header */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"><User2 className="h-5 w-5 text-primary" /></div>
                            <div>
                                <h1 className="text-lg font-semibold">{patient.first_name} {patient.last_name}</h1>
                                <p className="text-sm text-muted-foreground">{patient.file_number} · {response.procedureName || 'Procedure TBD'}{response.side && ` (${response.side})`}{response.surgeonName && ` · ${formatDoctorName(response.surgeonName)}`}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isFinalized ? (<Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><Lock className="h-3 w-3" />Finalized</Badge>) : isAmendment ? (<Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1"><FilePen className="h-3 w-3" />Amendment</Badge>) : (<Badge variant="secondary" className="gap-1"><Circle className="h-3 w-3" />Draft</Badge>)}
                            <Button variant="outline" size="sm" className="gap-1.5 h-8" asChild><a href={`/nurse/ward-prep/${caseId}/checklist/print`} target="_blank" rel="noopener noreferrer"><Printer className="h-3.5 w-3.5" />Print</a></Button>
                            {isFinalized && (<Button variant="outline" size="sm" className="gap-1.5 h-8 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowAmendDialog(true)}><FilePen className="h-3.5 w-3.5" />Amend</Button>)}
                        </div>
                    </div>
                    {isAmendment && (<div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg"><FilePen className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /><p className="text-sm text-amber-800"><strong>Amendment in Progress</strong> — This record was previously finalized. Make your corrections and re-finalize when ready.</p></div>)}
                    {patient.allergies && (<div className="mt-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg"><ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" /><p className="text-sm text-destructive"><strong>Allergies:</strong> {patient.allergies}</p></div>)}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-muted-foreground">Checklist Progress</span><span className="font-medium">{completedSections}/{totalSections} sections complete</span></div>
                        <Progress value={progressPercent} className={`h-2 ${progressPercent === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                    </div>
                    {isFinalized && form.signedAt && (<div className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 h-3.5 text-emerald-500" />Finalized on {format(new Date(form.signedAt), 'MMM d, yyyy HH:mm')}</div>)}
                </CardContent>
            </Card>

            {/* Title & Actions */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Pre-Operative Ward Checklist</h2>
                {(isAmendment || !isFinalized) && (
                    <div className="flex items-center gap-2">
                        <Button onClick={handleSave} disabled={saveMutation.isPending || !isDirty} className="gap-1.5">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Draft</Button>
                        <Button variant="default" onClick={() => setShowFinalizeDialog(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Lock className="h-4 w-4" />Finalize</Button>
                    </div>
                )}
            </div>

            {/* Surgical Plan Reference */}
            {response.casePlan && <SurgicalPlanReferencePanel casePlan={response.casePlan} />}

            {/* Checklist Sections */}
            <div className="space-y-6">
                {CHECKLIST_SECTIONS.map((section) => {
                    const SectionRenderer = SECTION_RENDERERS[section.key];
                    const sectionComplete = sectionCompletion[section.key]?.complete ?? false;
                    return (
                        <Card key={section.key} className="overflow-hidden">
                            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                <SectionStatus complete={sectionComplete} label={section.title} />
                            </div>
                            <CardContent className="p-5">
                                {SectionRenderer && (<SectionRenderer data={formData} onChange={handleChange} disabled={isDisabled} caseId={caseId} patient={patient} formResponseId={form.id} patientAllergies={patient.allergies} currentUser={user} />)}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Dialogs */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Finalize Checklist</DialogTitle><DialogDescription>This will lock the checklist and mark it as complete. You can still amend it later if needed.</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
                        <Button onClick={handleFinalize} disabled={finalizeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">{finalizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Finalize</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showMissingItems} onOpenChange={setShowMissingItems}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-amber-600">Missing Required Items</DialogTitle><DialogDescription>Please complete the following required items before finalizing:</DialogDescription></DialogHeader>
                    <ul className="list-disc pl-6 space-y-1">{missingItemsList.map((item, i) => (<li key={i} className="text-sm">{item}</li>))}</ul>
                    <DialogFooter><Button variant="outline" onClick={() => setShowMissingItems(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showAmendDialog} onOpenChange={setShowAmendDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Start Amendment</DialogTitle><DialogDescription>Please provide a reason for amending this finalized checklist. This will be recorded in the audit trail.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="amend-reason">Reason for amendment</Label><Textarea id="amend-reason" value={amendReason} onChange={(e) => setAmendReason(e.target.value)} placeholder="Describe why this record needs to be amended..." rows={4} /></div>
                        {amendError && (<p className="text-sm text-red-600">{amendError}</p>)}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAmendDialog(false)}>Cancel</Button>
                        <Button onClick={handleStartAmendment} disabled={isAmending} className="bg-amber-600 hover:bg-amber-700">{isAmending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start Amendment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}