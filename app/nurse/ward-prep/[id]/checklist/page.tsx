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
import { Textarea as UITextarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { format } from 'date-fns';
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

/**
 * Generic Select wrapper for string/enum fields.
 */
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

/**
 * SelectOrCustomField — enum dropdown with free-text fallback when OTHER selected.
 * Value is `UrinalysisResult | { custom: string }`.
 */
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
    // Determine the currently selected enum key.
    // Use '__none__' as the sentinel for "no selection" — Radix forbids empty string item values.
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

/**
 * SkinPrepSubSection — shown when nurse indicates skin prep was done.
 */
function SkinPrepSubSection({
    value,
    onChange,
    disabled,
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
                    value={sp.performerName}
                    onChange={(v) => set('performerName', v)}
                    placeholder="Nurse / tech name"
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
                {/* Hb/PCV */}
                <div className="space-y-1.5">
                    <Label className="text-sm">Hb / PCV</Label>
                    <Select
                        value={hbPcvValue}
                        onValueChange={(v) => set('hbPcv', v === NONE_VALUE ? '' : v)}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
                            {HB_PCV_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                            <SelectItem value="__custom__">Other (specify)</SelectItem>
                        </SelectContent>
                    </Select>
                    {showHbPcvNotes && (
                        <Input
                            placeholder="Add notes..."
                            value={d.hbPcvNotes || ''}
                            onChange={(e) => set('hbPcvNotes', e.target.value)}
                            disabled={disabled}
                            className="h-8 mt-1"
                        />
                    )}
                    {hbPcvValue === '__custom__' && (
                        <Input
                            placeholder="Specify Hb/PCV value..."
                            value={d.hbPcvNotes || ''}
                            onChange={(e) => set('hbPcv', e.target.value)}
                            disabled={disabled}
                            className="h-8 mt-1"
                        />
                    )}
                </div>

                {/* UECs */}
                <div className="space-y-1.5">
                    <Label className="text-sm">UECs</Label>
                    <Select
                        value={uecsValue}
                        onValueChange={(v) => set('uecs', v === NONE_VALUE ? '' : v)}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
                            {UECS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                            <SelectItem value="__custom__">Other (specify)</SelectItem>
                        </SelectContent>
                    </Select>
                    {showUecsNotes && (
                        <Input
                            placeholder="Add notes..."
                            value={d.uecsNotes || ''}
                            onChange={(e) => set('uecsNotes', e.target.value)}
                            disabled={disabled}
                            className="h-8 mt-1"
                        />
                    )}
                    {uecsValue === '__custom__' && (
                        <Input
                            placeholder="Specify UECs value..."
                            value={d.uecsNotes || ''}
                            onChange={(e) => set('uecs', e.target.value)}
                            disabled={disabled}
                            className="h-8 mt-1"
                        />
                    )}
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
            <MedicationAdministrationList
                caseId={caseId}
                patient={patient}
                formResponseId={formResponseId}
                readOnly={disabled}
            />

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
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-700">KNOWN ALLERGIES - PATIENT RECORD</p>
                        <p className="text-base font-semibold text-red-800 mt-1">{patientAllergies}</p>
                    </div>
                </div>
            )}
            <BooleanField label="Allergies documented" value={d.allergiesDocumented} onChange={(v) => set('allergiesDocumented', v)} disabled={disabled} />
            <TextField label="Allergy details (list all)" value={d.allergiesDetails} onChange={(v) => set('allergiesDetails', v)} disabled={disabled} />
            <Separator />
            <BooleanField label="Patient is nil by mouth (NPO)" value={d.npoStatus} onChange={(v) => set('npoStatus', v)} disabled={disabled} />
            {d.npoStatus && (
                <div className="pl-7">
                    <TimeField label="Fasted from (time)" value={d.npoFastedFromTime} onChange={(v) => set('npoFastedFromTime', v)} disabled={disabled} />
                </div>
            )}
        </div>
    );
}

function PreparationSection({ data, onChange, disabled }: SectionProps) {
    const d = data.preparation ?? {};
    const set = (field: string, value: any) => onChange({ ...data, preparation: { ...d, [field]: value } });

    // Show skin prep details if legacy shaveSkinPrep OR if skinPrep already exists
    const showSkinPrepDetails = !!d.shaveSkinPrep || !!d.skinPrep;

    return (
        <div className="space-y-3">
            <BooleanField label="Bath / shower and gown" value={d.bathGown} onChange={(v) => set('bathGown', v)} disabled={disabled} />
            <BooleanField label="Shave / skin prep done" value={d.shaveSkinPrep} onChange={(v) => set('shaveSkinPrep', v)} disabled={disabled} />
            {showSkinPrepDetails && (
                <SkinPrepSubSection
                    value={d.skinPrep as any}
                    onChange={(v) => set('skinPrep', v)}
                    disabled={disabled}
                />
            )}
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

    const warningMap = getVitalsWarningMap({
        bpSystolic: d.bpSystolic,
        bpDiastolic: d.bpDiastolic,
        pulse: d.pulse,
        respiratoryRate: d.respiratoryRate,
        temperature: d.temperature,
        spo2: d.spo2,
    });

    const urinalysisOptions = Object.values(UrinalysisResult).map((r) => ({
        value: r,
        label: URINALYSIS_LABELS[r],
    }));

    return (
        <div className="space-y-5">
            {warningMap.size > 0 && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />Vitals Advisory
                    </p>
                    {Array.from(warningMap.values()).map((w) => (
                        <p key={w.field} className={`text-xs ${w.severity === 'critical' ? 'text-red-700 font-medium' : 'text-amber-700'
                            }`}>
                            <span className="font-semibold">{w.label}:</span> {w.message}
                        </p>
                    ))}
                </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="BP Systolic" value={d.bpSystolic} onChange={(v) => set('bpSystolic', v)} min={60} max={260} unit="mmHg" disabled={disabled} warning={warningMap.get('bpSystolic')} />
                <NumberField label="BP Diastolic" value={d.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} min={30} max={160} unit="mmHg" disabled={disabled} warning={warningMap.get('bpDiastolic')} />
                <NumberField label="Pulse" value={d.pulse} onChange={(v) => set('pulse', v)} min={30} max={220} unit="bpm" disabled={disabled} warning={warningMap.get('pulse')} />
                <NumberField label="Respiratory Rate" value={d.respiratoryRate} onChange={(v) => set('respiratoryRate', v)} min={6} max={120} unit="/min" disabled={disabled} warning={warningMap.get('respiratoryRate')} />
                <NumberField label="Temperature" value={d.temperature} onChange={(v) => set('temperature', v)} min={34} max={42} step={0.1} unit="°C" disabled={disabled} warning={warningMap.get('temperature')} />
                <NumberField label="SpO₂" value={d.spo2} onChange={(v) => set('spo2', v)} min={50} max={100} unit="%" disabled={disabled} warning={warningMap.get('spo2')} />
                <TextField label="CVP (if applicable)" value={d.cvp} onChange={(v) => set('cvp', v)} disabled={disabled} />
            </div>
            <Separator />
            <BooleanField label="Bladder emptied" value={d.bladderEmptied} onChange={(v) => set('bladderEmptied', v)} disabled={disabled} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="Height" value={d.height} onChange={(v) => set('height', v)} min={50} max={250} unit="cm" disabled={disabled} />
                <NumberField label="Weight" value={d.weight} onChange={(v) => set('weight', v)} min={2} max={350} unit="kg" disabled={disabled} />
            </div>
            <Separator />
            <SelectOrCustomField
                label="Urinalysis results"
                value={d.urinalysis as UrinalysisValue | undefined}
                onChange={(v) => set('urinalysis', v)}
                options={urinalysisOptions}
                disabled={disabled}
            />
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

// ──────────────────────────────────────────────────────────────────────
// Section Header with completion
// ──────────────────────────────────────────────────────────────────────

function SectionStatus({ complete, label }: { complete: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-sm">{label}</span>
            {complete ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                    Complete
                </Badge>
            ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Pending
                </Badge>
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
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.procedure_plan }}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.special_instructions && (
                        <AccordionItem value="instructions" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Special Instructions</AccordionTrigger>
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.special_instructions }}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.pre_op_notes && (
                        <AccordionItem value="notes" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Pre-op Notes</AccordionTrigger>
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.pre_op_notes }}
                                />
                            </AccordionContent>
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

    // Amendment state
    const [showAmendDialog, setShowAmendDialog] = useState(false);
    const [amendReason, setAmendReason] = useState('');
    const [isAmending, setIsAmending] = useState(false);
    const [amendError, setAmendError] = useState('');

    // Initialize form data from server — apply normalizer for backward compat
    useEffect(() => {
        if (response?.form?.data) {
            const normalizedData = normalizeLegacyChecklistData(response.form.data);
            
            // Auto-fill handover with current user if not already set
            const userName = user?.firstName 
                ? `${user.firstName} ${user.lastName || ''}`.trim() 
                : user?.email || '';
            
            if (userName) {
                // Ensure handover object exists
                normalizedData.handover = normalizedData.handover || {};
                
                if (!normalizedData.handover.preparedByName) {
                    normalizedData.handover.preparedByName = userName;
                }
                if (!normalizedData.handover.handedOverByName) {
                    normalizedData.handover.handedOverByName = userName;
                }
            }
            
            setFormData(normalizedData);
            setIsDirty(false);
        }
    }, [response?.form?.data, user]);

    const formStatus = response?.form?.status;
    const isFinalized = formStatus === 'FINAL';
    const isAmendment = formStatus === 'AMENDMENT';
    // Locked only when truly FINAL. DRAFT and AMENDMENT are both editable.
    const isDisabled = isFinalized || !isAuthenticated;

    // Amendment submit handler
    const handleStartAmendment = async () => {
        if (amendReason.trim().length < 10) {
            setAmendError('Please provide a reason of at least 10 characters.');
            return;
        }
        setAmendError('');
        setIsAmending(true);
        try {
            const res = await fetch(
                `/api/nurse/surgical-cases/${caseId}/forms/preop-ward/amend`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: amendReason }),
                },
            );
            const json = await res.json();
            if (!res.ok) {
                setAmendError(json.error || 'Failed to start amendment.');
            } else {
                setShowAmendDialog(false);
                setAmendReason('');
                // Refetch — the query will update via React Query invalidation
                // Trigger a page reload to refresh the form state from server
                router.refresh();
            }
        } catch {
            setAmendError('Network error. Please try again.');
        } finally {
            setIsAmending(false);
        }
    };

    // Form change handler
    const handleChange = useCallback((newData: NursePreopWardChecklistDraft) => {
        setFormData(newData);
        setIsDirty(true);
    }, []);

    // Save handler
    const handleSave = () => {
        // Auto-fill handover fields with current user if empty
        const userName = user?.firstName 
            ? `${user.firstName} ${user.lastName || ''}`.trim() 
            : user?.email || '';
        
        const dataToSave = { ...formData };
        if (userName) {
            dataToSave.handover = dataToSave.handover || {};
            if (!dataToSave.handover.preparedByName) {
                dataToSave.handover.preparedByName = userName;
            }
            if (!dataToSave.handover.handedOverByName) {
                dataToSave.handover.handedOverByName = userName;
            }
        }
        
        saveMutation.mutate(dataToSave, {
            onSuccess: () => setIsDirty(false),
        });
    };

    // Finalize handler
    const handleFinalize = () => {
        finalizeMutation.mutate(undefined, {
            onSuccess: () => {
                setShowFinalizeDialog(false);
            },
            onError: (error) => {
                setShowFinalizeDialog(false);
                if (error instanceof FinalizeValidationError) {
                    setMissingItemsList(error.missingItems);
                    setShowMissingItems(true);
                }
            },
        });
    };

    // Compute progress
    const sectionCompletion = response?.form?.sectionCompletion ?? {};
    const completedSections = Object.values(sectionCompletion).filter((s: any) => s.complete).length;
    const totalSections = CHECKLIST_SECTIONS.length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    // ── Loading / Error / Auth states ────────────────────────────────

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
                    <Link href={`/nurse/pre-op-cases/${caseId}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Case
                    </Link>
                </Button>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Failed to load checklist</h3>
                        <p className="text-muted-foreground">{(error as Error)?.message || 'Unknown error'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const patient = response.patient;
    const form = response.form;

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-in fade-in duration-500">
            {/* ── Navigation ──────────────────────────────────────── */}
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/nurse/ward-prep/${caseId}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Case
                </Link>
            </Button>

            {/* ── Patient Header ──────────────────────────────────── */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                <User2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {patient.file_number} · {response.procedureName || 'Procedure TBD'}
                                    {response.side && ` (${response.side})`}
                                    {response.surgeonName && ` · Dr. ${response.surgeonName}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isFinalized ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                    <Lock className="h-3 w-3" />
                                    Finalized
                                </Badge>
                            ) : isAmendment ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                                    <FilePen className="h-3 w-3" />
                                    Amendment
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="gap-1">
                                    <Circle className="h-3 w-3" />
                                    Draft
                                </Badge>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8"
                                asChild
                            >
                                <a
                                    href={`/nurse/ward-prep/${caseId}/checklist/print`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                </a>
                            </Button>
                            {/* Create Amendment button — only on FINAL */}
                            {isFinalized && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                                    onClick={() => setShowAmendDialog(true)}
                                >
                                    <FilePen className="h-3.5 w-3.5" />
                                    Amend
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Amendment in-progress banner */}
                    {isAmendment && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <FilePen className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                <strong>Amendment in Progress</strong> — This record was previously finalized.
                                Make your corrections and re-finalize when ready.
                            </p>
                        </div>
                    )}

                    {/* Allergies alert */}
                    {patient.allergies && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">
                                <strong>Allergies:</strong> {patient.allergies}
                            </p>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Checklist Progress</span>
                            <span className="font-medium">
                                {completedSections}/{totalSections} sections complete
                            </span>
                        </div>
                        <Progress value={progressPercent} className={`h-2 ${progressPercent === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                    </div>

                    {/* Finalized info */}
                    {isFinalized && form.signedAt && (
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Finalized on {format(new Date(form.signedAt), 'MMM d, yyyy HH:mm')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Title ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Pre-Operative Ward Checklist</h2>
                {(isAmendment || !isFinalized) && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={saveMutation.isPending || !isDirty}
                            className="gap-1.5"
                        >
                            {saveMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Save className="h-3.5 w-3.5" />
                            )}
                            Save Draft
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (isDirty) {
                                    saveMutation.mutate(formData, {
                                        onSuccess: () => {
                                            setIsDirty(false);
                                            setShowFinalizeDialog(true);
                                        },
                                    });
                                } else {
                                    setShowFinalizeDialog(true);
                                }
                            }}
                            disabled={finalizeMutation.isPending}
                            className={`gap-1.5 ${isAmendment ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            <Lock className="h-3.5 w-3.5" />
                            {isAmendment ? 'Re-Finalize' : 'Finalize Checklist'}
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Surgical Plan Reference ──────────────────────── */}
            <SurgicalPlanReferencePanel casePlan={response.casePlan} />

            {/* ── Accordion Sections ─────────────────────────────── */}
            <Accordion type="multiple" defaultValue={CHECKLIST_SECTIONS.map((s) => s.key)} className="space-y-3">
                {CHECKLIST_SECTIONS.map((section) => {
                    const SectionRenderer = SECTION_RENDERERS[section.key];
                    const Icon = SECTION_ICONS[section.icon] || Circle;
                    const completion = sectionCompletion[section.key];
                    const isComplete = completion?.complete ?? false;

                    return (
                        <AccordionItem
                            key={section.key}
                            value={section.key}
                            className="border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow"
                        >
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${isComplete
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {isComplete ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Icon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <SectionStatus complete={isComplete} label={section.title} />
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                {SectionRenderer && (
                                    <SectionRenderer
                                        data={formData}
                                        onChange={handleChange}
                                        disabled={isDisabled}
                                        patientAllergies={section.key === 'allergiesNpo' ? patient.allergies : undefined}
                                        caseId={caseId}
                                        patient={patient}
                                        formResponseId={form.id}
                                        currentUser={user}
                                    />
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* ── Bottom Action Bar ──────────────────────────────── */}
            {(isAmendment || !isFinalized) && (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t py-3 px-4 -mx-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {isAmendment && <span className="text-amber-600 font-medium mr-2">⚠ Amendment in progress</span>}
                        {isDirty ? 'You have unsaved changes' : 'All changes saved'}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={saveMutation.isPending || !isDirty}
                        >
                            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Save Draft
                        </Button>
                        <Button
                            size="sm"
                            className={isAmendment ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                            onClick={() => {
                                if (isDirty) {
                                    saveMutation.mutate(formData, {
                                        onSuccess: () => {
                                            setIsDirty(false);
                                            setShowFinalizeDialog(true);
                                        },
                                    });
                                } else {
                                    setShowFinalizeDialog(true);
                                }
                            }}
                            disabled={finalizeMutation.isPending}
                        >
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            {isAmendment ? 'Re-Finalize' : 'Finalize'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Finalize Confirmation Dialog ───────────────────── */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalize Pre-Op Checklist?</DialogTitle>
                        <DialogDescription>
                            This will lock the checklist and record your digital signature.
                            All required fields must be completed. The checklist cannot be edited after finalization.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinalize}
                            disabled={finalizeMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {finalizeMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Finalize & Sign
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Missing Items Dialog ────────────────────────────── */}
            <Dialog open={showMissingItems} onOpenChange={setShowMissingItems}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Cannot Finalize
                        </DialogTitle>
                        <DialogDescription>
                            The following required fields are missing or invalid:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                        {missingItemsList.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                                <Circle className="h-3 w-3 text-destructive shrink-0 mt-1" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowMissingItems(false)}>
                            Close & Fix Issues
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Amendment Dialog ─────────────────────────────────── */}
            <Dialog open={showAmendDialog} onOpenChange={(open) => { setShowAmendDialog(open); if (!open) { setAmendReason(''); setAmendError(''); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FilePen className="h-5 w-5 text-amber-600" />
                            Create Amendment
                        </DialogTitle>
                        <DialogDescription>
                            This checklist is finalized. Provide a reason for amendment.
                            The existing record will be preserved in the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="amend-reason" className="text-sm font-medium">
                            Reason for Amendment <span className="text-destructive">*</span>
                        </Label>
                        <UITextarea
                            id="amend-reason"
                            placeholder="Describe why this record needs correction (min 10 characters)..."
                            value={amendReason}
                            onChange={(e) => { setAmendReason(e.target.value); setAmendError(''); }}
                            rows={3}
                            className="resize-none"
                        />
                        {amendError && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {amendError}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            After amendment, the checklist will be editable again.
                            You must re-finalize once corrections are complete.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAmendDialog(false); setAmendReason(''); setAmendError(''); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStartAmendment}
                            disabled={isAmending || amendReason.trim().length < 10}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isAmending ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opening...</>
                            ) : (
                                <><FilePen className="h-4 w-4 mr-2" />Start Amendment</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
