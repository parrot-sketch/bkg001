'use client';

/**
 * Nurse Intra-Operative Record Page
 *
 * Full-page clinical form for intra-operative documentation by the circulating nurse.
 * Sections: Theatre Setup, Counts (safety-critical), Specimens, Implants Used, Sign-Out.
 *
 * Features:
 * - Explicit save (nurse clicks "Save Draft")
 * - Section-level completion indicators
 * - "Finalize Record" with validation
 * - Locked read-only view after finalization
 * - Prominent count discrepancy warnings
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    useIntraOpRecord,
    useSaveIntraOpRecord,
    useFinalizeIntraOpRecord,
    IntraOpFinalizeValidationError,
} from '@/hooks/nurse/useIntraOpRecord';
import type {
    NurseIntraOpRecordDraft,
    SpecimenItem,
    ImplantItem,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { INTRAOP_SECTIONS } from '@/domain/clinical-forms/NurseIntraOpRecord';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    User2,
    ShieldAlert,
    Settings,
    Hash,
    FlaskConical,
    Package,
    ClipboardCheck,
    Plus,
    Trash2,
    Timer,
    Clock,
    UserCheck,
    Sparkles,
    Zap,
    Droplet,
    Bandage,
    Printer,
    LogIn,
    ShieldCheck,
    Stethoscope,
    Users,
    Droplets,
    Activity,
    ListCheck,
    Table,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
    TIMELINE_FIELD_ORDER,
    TIMELINE_FIELD_LABELS,
    type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';

// ──────────────────────────────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
    entry: LogIn,
    safety: ShieldCheck,
    timings: Clock,
    staffing: Users,
    diagnoses: Stethoscope,
    positioning: UserCheck,
    catheter: Droplets,
    skinPrep: Sparkles,
    equipment: Zap,
    surgicalDetails: Activity,
    counts: ListCheck,
    closure: Bandage,
    fluids: Droplet,
    tables: Table,
};

// ──────────────────────────────────────────────────────────────────────
// Field Components (reusable, data-driven)
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
            <Input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-9 max-w-[140px]"
            />
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
}: {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm">
                {label} {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
            </Label>
            <Input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                min={min}
                max={max}
                step={step || 1}
                disabled={disabled}
                className="h-9 max-w-[150px]"
            />
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section Renderers
// ──────────────────────────────────────────────────────────────────────

interface SectionProps {
    data: NurseIntraOpRecordDraft;
    onChange: (data: NurseIntraOpRecordDraft) => void;
    disabled: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Section Renderers 1-5
// ──────────────────────────────────────────────────────────────────────

function ArrivalSection({ data, onChange, disabled }: SectionProps) {
    const d = data.entry ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, entry: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Arrival Method</Label>
                    <Select value={d.arrivalMethod || ''} onValueChange={(v) => set('arrivalMethod', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="STRETCHER">Stretcher</SelectItem>
                            <SelectItem value="WHEELCHAIR">Wheelchair</SelectItem>
                            <SelectItem value="WALKING">Walking</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <TimeField label="Time In" value={d.timeIn} onChange={(v) => set('timeIn', v)} disabled={disabled} />
                <div className="space-y-1.5">
                    <Label className="text-sm">ASA Class</Label>
                    <Select value={d.asaClass || ''} onValueChange={(v) => set('asaClass', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="ASA" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">ASA 1</SelectItem>
                            <SelectItem value="2">ASA 2</SelectItem>
                            <SelectItem value="3">ASA 3</SelectItem>
                            <SelectItem value="4">ASA 4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <TextField label="Allergies" value={d.allergies} onChange={(v) => set('allergies', v)} disabled={disabled} placeholder="Nil known / Specific allergies" />
            <TextField label="General Comments" value={d.comments} onChange={(v) => set('comments', v)} disabled={disabled} />
        </div>
    );
}

function SafetyChecklistSection({ data, onChange, disabled, procedureName, side }: SectionProps & { procedureName?: string; side?: string }) {
    const d = data.safety ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, safety: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            {(procedureName || side) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Time-Out Verification</p>
                    <p className="text-sm font-semibold text-amber-900">
                        Goal: Confirm {procedureName || 'Procedure'} {side ? `on ${side.toUpperCase()} side` : ''}
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <BooleanField label="Patient ID Verified with Reg No." value={d.patientIdVerified} onChange={(v) => set('patientIdVerified', v)} disabled={disabled} />
                <BooleanField label="Informed Consent Signed" value={d.informedConsentSigned} onChange={(v) => set('informedConsentSigned', v)} disabled={disabled} />
                <BooleanField label="Pre-op Checklist Completed" value={d.preOpChecklistCompleted} onChange={(v) => set('preOpChecklistCompleted', v)} disabled={disabled} />
                <BooleanField label="WHO Checklist Completed" value={d.whoChecklistCompleted} onChange={(v) => set('whoChecklistCompleted', v)} disabled={disabled} />
                <BooleanField label="Arrived with IV infusing" value={d.arrivedWithIvInfusing} onChange={(v) => set('arrivedWithIvInfusing', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="IV Started by" value={d.ivStartedBy} onChange={(v) => set('ivStartedBy', v)} disabled={disabled} />
                <TimeField label="IV Start Time" value={d.ivStartTime} onChange={(v) => set('ivStartTime', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="space-y-3">
                <BooleanField label="Antibiotic ordered" value={d.antibioticOrdered} onChange={(v) => set('antibioticOrdered', v)} disabled={disabled} />
                {d.antibioticOrdered && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-8 animate-in slide-in-from-top-1">
                        <TextField label="Type" value={d.antibioticType} onChange={(v) => set('antibioticType', v)} disabled={disabled} />
                        <TextField label="Ordered by" value={d.antibioticOrderedBy} onChange={(v) => set('antibioticOrderedBy', v)} disabled={disabled} />
                        <TimeField label="Time" value={d.antibioticTime} onChange={(v) => set('antibioticTime', v)} disabled={disabled} />
                    </div>
                )}
            </div>
        </div>
    );
}

function TimingsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.timings ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, timings: { ...d, [field]: value } });

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TimeField label="Time in Theatre" value={d.timeIntoTheatre} onChange={(v) => set('timeIntoTheatre', v)} disabled={disabled} />
            <TimeField label="Time out of Theatre" value={d.timeOutOfTheatre} onChange={(v) => set('timeOutOfTheatre', v)} disabled={disabled} />
            <TimeField label="Operation Start" value={d.operationStart} onChange={(v) => set('operationStart', v)} disabled={disabled} />
            <TimeField label="Operation Finish" value={d.operationFinish} onChange={(v) => set('operationFinish', v)} disabled={disabled} />
        </div>
    );
}

function StaffingSection({ data, onChange, disabled }: SectionProps) {
    const d = data.staffing ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, staffing: { ...d, [field]: value } });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Surgeon" value={d.surgeon} onChange={(v) => set('surgeon', v)} disabled={disabled} />
            <TextField label="Assistant" value={d.assistant} onChange={(v) => set('assistant', v)} disabled={disabled} />
            <TextField label="Anaesthesiologist" value={d.anaesthesiologist} onChange={(v) => set('anaesthesiologist', v)} disabled={disabled} />
            <TextField label="Scrub Nurse" value={d.scrubNurse} onChange={(v) => set('scrubNurse', v)} disabled={disabled} />
            <TextField label="Circulating Nurse" value={d.circulatingNurse} onChange={(v) => set('circulatingNurse', v)} disabled={disabled} />
            <TextField label="Observers / Other" value={d.observers} onChange={(v) => set('observers', v)} disabled={disabled} />
        </div>
    );
}

function DiagnosesSection({ data, onChange, disabled }: SectionProps) {
    const d = data.diagnoses ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, diagnoses: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <TextField label="Pre-op Diagnosis" value={d.preOpDiagnosis} onChange={(v) => set('preOpDiagnosis', v)} disabled={disabled} />
            <TextField label="Intra-op Diagnosis" value={d.intraOpDiagnosis} onChange={(v) => set('intraOpDiagnosis', v)} disabled={disabled} />
            <TextField label="Operation(s) Performed" value={d.operationPerformed} onChange={(v) => set('operationPerformed', v)} disabled={disabled} />
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section Renderers 6-10
// ──────────────────────────────────────────────────────────────────────

function PositioningSection({ data, onChange, disabled }: SectionProps) {
    const d = data.positioning ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, positioning: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Patient Position (tick)</Label>
                    <Select value={d.position || ''} onValueChange={(v) => set('position', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Position" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PRONE">Prone</SelectItem>
                            <SelectItem value="SUPINE">Supine</SelectItem>
                            <SelectItem value="LATERAL">Lateral</SelectItem>
                            <SelectItem value="LITHOTOMY">Lithotomy</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {d.position === 'OTHER' && <TextField label="Other Position" value={d.otherPosition} onChange={(v) => set('otherPosition', v)} disabled={disabled} />}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-2">
                    <BooleanField label="Safety belt applied" value={d.safetyBeltApplied} onChange={(v) => set('safetyBeltApplied', v)} disabled={disabled} />
                    {d.safetyBeltApplied && <TextField label="Belt Position" value={d.safetyBeltPosition} onChange={(v) => set('safetyBeltPosition', v)} disabled={disabled} />}
                </div>
                <div className="space-y-2">
                    <BooleanField label="Arms secured" value={d.armsSecured} onChange={(v) => set('armsSecured', v)} disabled={disabled} />
                    {d.armsSecured && <TextField label="Arms Position" value={d.armsPosition} onChange={(v) => set('armsPosition', v)} disabled={disabled} />}
                </div>
                <BooleanField label="Patient in proper body alignment" value={d.bodyAlignmentCorrect} onChange={(v) => set('bodyAlignmentCorrect', v)} disabled={disabled} />
                <TextField label="Pressure points (describe)" value={d.pressurePointsDescribe} onChange={(v) => set('pressurePointsDescribe', v)} disabled={disabled} />
            </div>
        </div>
    );
}

function CatheterSection({ data, onChange, disabled }: SectionProps) {
    const d = data.catheter ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, catheter: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BooleanField label="Urinary catheter in-situ" value={d.inSitu} onChange={(v) => set('inSitu', v)} disabled={disabled} />
                <BooleanField label="Urinary catheter inserted in theatre" value={d.insertedInTheatre} onChange={(v) => set('insertedInTheatre', v)} disabled={disabled} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Type" value={d.type} onChange={(v) => set('type', v)} disabled={disabled} />
                <TextField label="Size" value={d.size} onChange={(v) => set('size', v)} disabled={disabled} />
            </div>
        </div>
    );
}

function SkinPrepSection({ data, onChange, disabled }: SectionProps) {
    const d = data.skinPrep ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, skinPrep: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <TextField label="Shaved by" value={d.shavedBy} onChange={(v) => set('shavedBy', v)} disabled={disabled} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Prep Agent</Label>
                    <Select value={d.prepAgent || ''} onValueChange={(v) => set('prepAgent', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Agent" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="HIBITANE_SPIRIT">Hibitane in spirit</SelectItem>
                            <SelectItem value="POVIDONE_IODINE">Povidone Iodine</SelectItem>
                            <SelectItem value="HIBITANE_WATER">Hibitane in water</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {d.prepAgent === 'OTHER' && <TextField label="Other Agent" value={d.otherPrepAgent} onChange={(v) => set('otherPrepAgent', v)} disabled={disabled} />}
            </div>
        </div>
    );
}

function EquipmentSection({ data, onChange, disabled }: SectionProps) {
    const el = data.equipment?.electrosurgical ?? {};
    const tq = data.equipment?.tourniquet ?? {};

    const setEl = (field: string, value: any) =>
        onChange({ ...data, equipment: { ...data.equipment, electrosurgical: { ...el, [field]: value } } });
    const setTq = (field: string, value: any) =>
        onChange({ ...data, equipment: { ...data.equipment, tourniquet: { ...tq, [field]: value } } });

    return (
        <div className="space-y-6">
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Electrosurgical / Cautery</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanField label="Cautery Used" value={el.cauteryUsed} onChange={(v) => setEl('cauteryUsed', v)} disabled={disabled} />
                    <TextField label="Unit No." value={el.unitNo} onChange={(v) => setEl('unitNo', v)} disabled={disabled} />
                    <TextField label="Mode" value={el.mode} onChange={(v) => setEl('mode', v)} disabled={disabled} />
                    <div className="grid grid-cols-2 gap-4">
                        <TextField label="Cut Set" value={el.cutSet} onChange={(v) => setEl('cutSet', v)} disabled={disabled} />
                        <TextField label="Coag Set" value={el.coagSet} onChange={(v) => setEl('coagSet', v)} disabled={disabled} />
                    </div>
                </div>
                <div className="flex items-center gap-8 mt-2">
                    <BooleanField label="Skin Checked (Before)" value={el.skinCheckedBefore} onChange={(v) => setEl('skinCheckedBefore', v)} disabled={disabled} />
                    <BooleanField label="Skin Checked (After)" value={el.skinCheckedAfter} onChange={(v) => setEl('skinCheckedAfter', v)} disabled={disabled} />
                </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Tourniquet</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanField label="Tourniquet Used" value={tq.tourniquetUsed} onChange={(v) => setTq('tourniquetUsed', v)} disabled={disabled} />
                    <TextField label="Type" value={tq.type} onChange={(v) => setTq('type', v)} disabled={disabled} />
                    <TextField label="Site" value={tq.site} onChange={(v) => setTq('site', v)} disabled={disabled} />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Laterality</Label>
                            <Select value={tq.laterality || ''} onValueChange={(v) => setTq('laterality', v)} disabled={disabled}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Side" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RT">Right (Rt)</SelectItem>
                                    <SelectItem value="LT">Left (Lt)</SelectItem>
                                    <SelectItem value="N/A">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <TextField label="Pressure" value={tq.pressure} onChange={(v) => setTq('pressure', v)} disabled={disabled} />
                    </div>
                    <TimeField label="Time On" value={tq.timeOn} onChange={(v) => setTq('timeOn', v)} disabled={disabled} />
                    <TimeField label="Time Off" value={tq.timeOff} onChange={(v) => setTq('timeOff', v)} disabled={disabled} />
                </div>
                <div className="flex items-center gap-8 mt-2">
                    <BooleanField label="Skin Checked (Before)" value={tq.skinCheckedBefore} onChange={(v) => setTq('skinCheckedBefore', v)} disabled={disabled} />
                    <BooleanField label="Skin Checked (After)" value={tq.skinCheckedAfter} onChange={(v) => setTq('skinCheckedAfter', v)} disabled={disabled} />
                </div>
            </div>
        </div>
    );
}

function SurgicalDetailsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.surgicalDetails ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, surgicalDetails: { ...d, [field]: value } });

    const toggle = (listKey: string, val: string) => {
        const current = Array.isArray((d as any)[listKey]) ? (d as any)[listKey] : [];
        const next = current.includes(val) ? current.filter((x: string) => x !== val) : [...current, val];
        set(listKey, next);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Drain Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {['CORRUGATED', 'PORTOVAC', 'UWS', 'NG'].map(t => (
                            <div key={t} className="flex items-center gap-2">
                                <Checkbox checked={d.drainType?.includes(t as any)} onCheckedChange={() => toggle('drainType', t)} disabled={disabled} />
                                <Label className="text-xs font-normal">{t}</Label>
                            </div>
                        ))}
                    </div>
                    <TextField label="Other Drain Type" value={d.otherDrainType} onChange={(v) => set('otherDrainType', v)} disabled={disabled} />
                </div>
                <div className="space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Wound Irrigation</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {['SALINE', 'WATER', 'POVIDONE_IODINE', 'ANTIBIOTIC'].map(t => (
                            <div key={t} className="flex items-center gap-2">
                                <Checkbox checked={d.woundIrrigation?.includes(t as any)} onCheckedChange={() => toggle('woundIrrigation', t)} disabled={disabled} />
                                <Label className="text-xs font-normal">{t.replace('_', ' ')}</Label>
                            </div>
                        ))}
                    </div>
                    <TextField label="Other Irrigation" value={d.otherIrrigation} onChange={(v) => set('otherIrrigation', v)} disabled={disabled} />
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Wound Pack Type" value={d.woundPackType} onChange={(v) => set('woundPackType', v)} disabled={disabled} />
                <TextField label="Wound Pack Site" value={d.woundPackSite} onChange={(v) => set('woundPackSite', v)} disabled={disabled} />
            </div>
            <Separator />
            <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Wound Class</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'INFECTED'].map(c => (
                        <div key={c} className="flex items-center gap-2">
                            <Checkbox checked={d.woundClass === c} onCheckedChange={() => set('woundClass', c)} disabled={disabled} />
                            <Label className="text-xs font-normal">{c.replace('_', ' ')}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <Separator />
            <TextField label="Intra-op X-Rays taken" value={d.intraOpXraysTaken} onChange={(v) => set('intraOpXraysTaken', v)} disabled={disabled} />
        </div>
    );
}

function CountsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.counts ?? {};
    const items = Array.isArray(d.items) ? d.items : [];
    const set = (field: string, value: any) =>
        onChange({ ...data, counts: { ...d, [field]: value } });

    const updateItem = (index: number, field: string, value: number) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: value };
        set('items', next);
    };

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Item</th>
                            <th className="px-4 py-3 font-semibold text-center">Preliminary</th>
                            <th className="px-4 py-3 font-semibold text-center">Wound Closure</th>
                            <th className="px-4 py-3 font-semibold text-center">Final Count</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(items as any[]).map((item: any, idx: number) => (
                            <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.preliminary} onChange={(e) => updateItem(idx, 'preliminary', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center" />
                                </td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.woundClosure} onChange={(e) => updateItem(idx, 'woundClosure', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center" />
                                </td>
                                <td className="px-4 py-3">
                                    <Input type="number" value={item.final} onChange={(e) => updateItem(idx, 'final', parseInt(e.target.value) || 0)} disabled={disabled} className="h-8 w-20 mx-auto text-center font-semibold text-blue-600" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                    <Label className="text-sm font-semibold">Count Correct?</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox checked={d.countCorrect === true} onCheckedChange={() => set('countCorrect', true)} disabled={disabled} />
                            <Label className="text-sm">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox checked={d.countCorrect === false} onCheckedChange={() => set('countCorrect', false)} disabled={disabled} />
                            <Label className="text-sm">No</Label>
                        </div>
                    </div>
                </div>
                {!d.countCorrect && <TextField label="Action taken" value={d.actionIfIncorrect} onChange={(v) => set('actionIfIncorrect', v)} disabled={disabled} placeholder="Describe corrective action..." />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Scrub Nurse Signature (Name)" value={d.scrubNurseSignature} onChange={(v) => set('scrubNurseSignature', v)} disabled={disabled} />
                <TextField label="Circulating Nurse Signature (Name)" value={d.circulatingNurseSignature} onChange={(v) => set('circulatingNurseSignature', v)} disabled={disabled} />
            </div>
        </div>
    );
}

function FluidsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.fluids ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, fluids: { ...d, [field]: value } });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Intravenous Infusion / Transfusions</h4>
                    <div className="space-y-4">
                        <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-3">
                            <Label className="text-[10px] font-bold text-red-600 uppercase">Blood Transfusion (mL)</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <NumberField label="Packed Cells" value={d.bloodTransfusionPackedCellsMl} onChange={(v) => set('bloodTransfusionPackedCellsMl', v || 0)} disabled={disabled} />
                                <NumberField label="Whole" value={d.bloodTransfusionWholeMl} onChange={(v) => set('bloodTransfusionWholeMl', v || 0)} disabled={disabled} />
                                <NumberField label="Others" value={d.bloodTransfusionOtherMl} onChange={(v) => set('bloodTransfusionOtherMl', v || 0)} disabled={disabled} />
                            </div>
                        </div>
                        <NumberField label="Intravenous Infusion" value={d.ivInfusionTotalMl} onChange={(v) => set('ivInfusionTotalMl', v || 0)} unit="mL" disabled={disabled} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Measurements</h4>
                    <div className="space-y-4">
                        <NumberField label="Estimated Blood Loss" value={d.estimatedBloodLossMl} onChange={(v) => set('estimatedBloodLossMl', v || 0)} unit="mL" disabled={disabled} />
                        <NumberField label="Urinary Output" value={d.urinaryOutputMl} onChange={(v) => set('urinaryOutputMl', v || 0)} unit="mL" disabled={disabled} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function DynamicTableSection({ data, onChange, disabled }: SectionProps) {
    // This section handles Medications, Implants, and Specimens
    const medications = Array.isArray(data.medications) ? data.medications : [];
    const implants = Array.isArray(data.implants) ? data.implants : [];
    const specimens = Array.isArray(data.specimens) ? data.specimens : [];

    const setMeds = (v: any[]) => onChange({ ...data, medications: v });
    const setImplants = (v: any[]) => onChange({ ...data, implants: v });
    const setSpecimens = (v: any[]) => onChange({ ...data, specimens: v });

    return (
        <div className="space-y-12">
            {/* Medications */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Medications</h4>
                    <Button variant="outline" size="sm" onClick={() => setMeds([...medications, { drug: '', route: '', time: '', sign: '' }])} disabled={disabled}>
                        <Plus className="h-4 w-4 mr-2" /> Add Medication
                    </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 h-10">
                            <tr>
                                <th className="px-3 font-medium text-left">Medication/Drug</th>
                                <th className="px-3 font-medium text-left">Route</th>
                                <th className="px-3 font-medium text-left w-32">Time</th>
                                <th className="px-3 font-medium text-left w-32">Sign</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {medications.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="p-2"><Input value={item.drug} onChange={(e) => { const n = [...medications]; n[idx].drug = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.route} onChange={(e) => { const n = [...medications]; n[idx].route = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input type="time" value={item.time} onChange={(e) => { const n = [...medications]; n[idx].time = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.sign} onChange={(e) => { const n = [...medications]; n[idx].sign = e.target.value; setMeds(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setMeds(medications.filter((_, i) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                </tr>
                            ))}
                            {medications.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground italic">No medications recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Implants */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Surgical Implants / Prosthesis</h4>
                    <Button variant="outline" size="sm" onClick={() => setImplants([...implants, { item: '', lotNo: '', size: '' }])} disabled={disabled}>
                        <Plus className="h-4 w-4 mr-2" /> Add Implant
                    </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 h-10">
                            <tr>
                                <th className="px-3 font-medium text-left">Item</th>
                                <th className="px-3 font-medium text-left">Lot No.</th>
                                <th className="px-3 font-medium text-left">Size</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {implants.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="p-2"><Input value={item.item} onChange={(e) => { const n = [...implants]; n[idx].item = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.lotNo} onChange={(e) => { const n = [...implants]; n[idx].lotNo = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Input value={item.size} onChange={(e) => { const n = [...implants]; n[idx].size = e.target.value; setImplants(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setImplants(implants.filter((_, i) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                </tr>
                            ))}
                            {implants.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground italic">No implants recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Specimens */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Specimens</h4>
                    <Button variant="outline" size="sm" onClick={() => setSpecimens([...specimens, { type: '', histology: false, cytology: false, notForAnalysis: false, disposition: '' }])} disabled={disabled}>
                        <Plus className="h-4 w-4 mr-2" /> Add Specimen
                    </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 h-10">
                            <tr>
                                <th className="px-3 font-medium text-left">Type</th>
                                <th className="px-3 font-medium text-center">Hist</th>
                                <th className="px-3 font-medium text-center">Cyto</th>
                                <th className="px-3 font-medium text-center">N.A.</th>
                                <th className="px-3 font-medium text-left">Disposition</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {specimens.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="p-2"><Input value={item.type} onChange={(e) => { const n = [...specimens]; n[idx].type = e.target.value; setSpecimens(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.histology} onCheckedChange={(v) => { const n = [...specimens]; n[idx].histology = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.cytology} onCheckedChange={(v) => { const n = [...specimens]; n[idx].cytology = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2 text-center"><Checkbox checked={item.notForAnalysis} onCheckedChange={(v) => { const n = [...specimens]; n[idx].notForAnalysis = !!v; setSpecimens(n); }} disabled={disabled} /></td>
                                    <td className="p-2"><Input value={item.disposition} onChange={(e) => { const n = [...specimens]; n[idx].disposition = e.target.value; setSpecimens(n); }} disabled={disabled} className="h-8" /></td>
                                    <td className="p-2"><Button variant="ghost" size="icon" onClick={() => setSpecimens(specimens.filter((_, i) => i !== idx))} disabled={disabled}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                                </tr>
                            ))}
                            {specimens.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground italic">No specimens recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <TextField label="Items to be returned to theatre" value={data.itemsToReturnToTheatre} onChange={(v) => onChange({ ...data, itemsToReturnToTheatre: v })} disabled={disabled} />
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Billing Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <TextField label="Anaesthetic Materials Charge" value={data.billing?.anaestheticMaterialsCharge} onChange={(v) => onChange({ ...data, billing: { ...data.billing, anaestheticMaterialsCharge: v } })} disabled={disabled} />
                        <TextField label="Theatre Fee" value={data.billing?.theatreFee} onChange={(v) => onChange({ ...data, billing: { ...data.billing, theatreFee: v } })} disabled={disabled} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClosureAndFinalSection({ data, onChange, disabled }: SectionProps) {
    const d = data.closure ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, closure: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Skin Closure</Label>
                    <Select value={d.skinClosure || ''} onValueChange={(v) => set('skinClosure', v)} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Closure method" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NON_ABSORBABLE">Non-Absorbable</SelectItem>
                            <SelectItem value="ABSORBABLE">Absorbable</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <TextField label="Dressing Applied" value={d.dressingApplied} onChange={(v) => set('dressingApplied', v)} disabled={disabled} />
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section renderers map
// ──────────────────────────────────────────────────────────────────────

const SECTION_RENDERERS: Record<string, React.FC<SectionProps>> = {
    entry: ArrivalSection,
    safety: SafetyChecklistSection,
    timings: TimingsSection,
    staffing: StaffingSection,
    diagnoses: DiagnosesSection,
    positioning: PositioningSection,
    catheter: CatheterSection,
    skinPrep: SkinPrepSection,
    equipment: EquipmentSection,
    surgicalDetails: SurgicalDetailsSection,
    counts: CountsSection,
    closure: ClosureAndFinalSection,
    fluids: FluidsSection,
    tables: DynamicTableSection,
};

// ──────────────────────────────────────────────────────────────────────
// Section Header with completion
// ──────────────────────────────────────────────────────────────────────
// Operative Timeline Panel (read-only or editable for NURSE)
// ──────────────────────────────────────────────────────────────────────

function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

function OperativeTimelinePanel({ caseId, userRole }: { caseId: string; userRole: string }) {
    const [loading, setLoading] = useState(true);
    const [timelineData, setTimelineData] = useState<TimelineResultDto | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    const canEdit = userRole === 'NURSE' || userRole === 'THEATER_TECHNICIAN' || userRole === 'ADMIN';

    useEffect(() => {
        const token = getToken();
        fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setTimelineData(json.data);
                } else {
                    setError(json.error || 'Failed to load timeline');
                }
            })
            .catch(() => setError('Failed to load timeline'))
            .finally(() => setLoading(false));
    }, [caseId]);

    const handleSetNow = async (field: TimelineFieldName) => {
        const token = getToken();
        const now = new Date().toISOString();
        try {
            const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ [field]: now }),
            });
            const json = await res.json();
            if (json.success) {
                setTimelineData(json.data);
            } else {
                setError(json.error || 'Update failed');
            }
        } catch {
            setError('Failed to update timestamp');
        }
    };

    const formatTime = (iso: string | null): string => {
        if (!iso) return '—';
        try {
            return format(parseISO(iso), 'HH:mm');
        } catch {
            return iso;
        }
    };

    if (loading) {
        return (
            <Card className="border-cyan-200 bg-cyan-50/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Timeline: {error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const timeline = timelineData?.timeline;
    const durations = timelineData?.durations;
    const missingItems = timelineData?.missingItems ?? [];

    return (
        <Card className="border-cyan-200 bg-cyan-50/20">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-between w-full"
                >
                    <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-cyan-600" />
                        <span className="text-sm font-semibold text-slate-800">Operative Timeline</span>
                        {missingItems.length > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                                {missingItems.length} missing
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {collapsed ? 'Show' : 'Hide'}
                    </span>
                </button>

                {!collapsed && timeline && (
                    <>
                        {/* Timeline Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TIMELINE_FIELD_ORDER.map((field) => {
                                const value = timeline[field];
                                return (
                                    <div
                                        key={field}
                                        className={`rounded-md border px-2.5 py-2 ${value
                                            ? 'bg-emerald-50/50 border-emerald-200'
                                            : 'bg-white border-slate-200'
                                            }`}
                                    >
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {TIMELINE_FIELD_LABELS[field]}
                                        </p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {formatTime(value)}
                                            </p>
                                            {canEdit && !value && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-1.5 text-[10px] text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetNow(field);
                                                    }}
                                                >
                                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                                    Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Derived Durations */}
                        {durations && (
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                {[
                                    { label: 'OR', value: durations.orTimeMinutes },
                                    { label: 'Surgery', value: durations.surgeryTimeMinutes },
                                    { label: 'Prep', value: durations.prepTimeMinutes },
                                    { label: 'Close-out', value: durations.closeOutTimeMinutes },
                                    { label: 'Anesthesia', value: durations.anesthesiaTimeMinutes },
                                ]
                                    .filter((d) => d.value !== null)
                                    .map((d) => (
                                        <span
                                            key={d.label}
                                            className="text-[11px] text-slate-600 font-medium"
                                        >
                                            {d.label}: <strong>{d.value}min</strong>
                                        </span>
                                    ))}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
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

function SectionStatus({ complete, label, isCritical }: { complete: boolean; label: string; isCritical?: boolean }) {
    return (
        <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-sm">{label}</span>
            {isCritical && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                    Safety Critical
                </Badge>
            )}
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

// ──────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────

export default function NurseIntraOpRecordPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const caseId = params?.caseId as string;

    const { data: response, isLoading, error } = useIntraOpRecord(caseId);
    const saveMutation = useSaveIntraOpRecord(caseId);
    const finalizeMutation = useFinalizeIntraOpRecord(caseId);

    const [formData, setFormData] = useState<NurseIntraOpRecordDraft>({
        entry: {},
        safety: {},
        timings: {},
        diagnoses: {},
        positioning: {},
        catheter: {},
        skinPrep: {},
        surgicalDetails: {},
        equipment: {
            electrosurgical: {},
            tourniquet: {},
        },
        staffing: {},
        counts: { items: [] },
        closure: {},
        fluids: {},
        medications: [],
        implants: [],
        specimens: [],
        itemsToReturnToTheatre: '',
        billing: {
            anaestheticMaterialsCharge: '',
            theatreFee: '',
        },
    });
    const [isDirty, setIsDirty] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [showMissingItems, setShowMissingItems] = useState(false);
    const [missingItemsList, setMissingItemsList] = useState<string[]>([]);

    // Initialize form data from server
    useEffect(() => {
        if (response?.form?.data) {
            setFormData(response.form.data);
            setIsDirty(false);
        }
    }, [response?.form?.data]);

    const isFinalized = response?.form?.status === 'FINAL';
    const isDisabled = isFinalized || !isAuthenticated;

    // Form change handler
    const handleChange = useCallback((newData: NurseIntraOpRecordDraft) => {
        setFormData(newData);
        setIsDirty(true);
    }, []);

    // Save handler
    const handleSave = () => {
        saveMutation.mutate(formData, {
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
                if (error instanceof IntraOpFinalizeValidationError) {
                    setMissingItemsList(error.missingItems);
                    setShowMissingItems(true);
                }
            },
        });
    };

    // Compute progress
    const sectionCompletion = response?.form?.sectionCompletion ?? {};
    const completedSections = Object.values(sectionCompletion).filter((s: any) => s.complete).length;
    const totalSections = INTRAOP_SECTIONS.length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    // Count discrepancy warning
    const hasDiscrepancy = formData.counts?.countCorrect === false;

    // ── Loading / Error / Auth states ────────────────────────────────

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">Please log in to access the intra-op record.</p>
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

    if (error || !response) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/nurse/dashboard">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Link>
                </Button>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Failed to load intra-op record</h3>
                        <p className="text-muted-foreground">{(error as Error)?.message || 'Unknown error'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const patient = response.patient;

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-in fade-in duration-500">
            {/* ── Navigation ──────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" asChild>
                    <Link href="/nurse/dashboard">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/nurse/intra-op-cases/${caseId}/record/print`} target="_blank">
                        <Printer className="w-4 h-4 mr-2" /> Print Record
                    </Link>
                </Button>
            </div>

            {/* ── Patient Header ──────────────────────────────────── */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
                                <User2 className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {patient.file_number}
                                    {response.procedureName && ` · ${response.procedureName}`}
                                    {response.side && ` (${response.side})`}
                                    {response.surgeonName && ` · Dr. ${response.surgeonName}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {response.caseStatus}
                            </Badge>
                            {isFinalized ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                    <Lock className="h-3 w-3" />
                                    Finalized
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="gap-1">
                                    <Circle className="h-3 w-3" />
                                    Draft
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Allergies alert */}
                    {
                        patient.allergies && (
                            <div className="mt-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">
                                    <strong>Allergies:</strong> {patient.allergies}
                                </p>
                            </div>
                        )
                    }

                    {/* Count discrepancy global alert */}
                    {
                        hasDiscrepancy && !isFinalized && (
                            <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">
                                    <strong>Count Discrepancy:</strong> A swab/instrument/sharps count discrepancy has been flagged. This will block transition to RECOVERY until resolved.
                                </p>
                            </div>
                        )
                    }

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Record Progress</span>
                            <span className="font-medium">
                                {completedSections}/{totalSections} sections complete
                            </span>
                        </div>
                        <Progress value={progressPercent} className={`h-2 ${progressPercent === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                    </div>

                    {/* Finalized info */}
                    {
                        isFinalized && response.form?.signedAt && (
                            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                Finalized on {format(new Date(response.form.signedAt), 'MMM d, yyyy HH:mm')}
                            </div>
                        )
                    }
                </CardContent >
            </Card >

            {/* ── Title + Actions ─────────────────────────────────── */}
            < div className="flex items-center justify-between" >
                <h2 className="text-xl font-bold tracking-tight">Intra-Operative Nurse Record</h2>
                {
                    !isFinalized && (
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
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Finalize Record
                            </Button>
                        </div>
                    )
                }
            </div >

            <OperativeTimelinePanel caseId={caseId} userRole={user?.role || ''} />

            {/* ── Surgical Plan Reference ──────────────────────── */}
            <SurgicalPlanReferencePanel casePlan={response.casePlan} />

            {/* ── Accordion Sections ─────────────────────────────── */}
            <Accordion type="multiple" defaultValue={INTRAOP_SECTIONS.map((s) => s.key)} className="space-y-3">
                {INTRAOP_SECTIONS.map((section) => {
                    const SectionRenderer = SECTION_RENDERERS[section.key];
                    const Icon = SECTION_ICONS[section.key] || Circle;
                    const completion = sectionCompletion[section.key];
                    const isComplete = completion?.complete ?? false;

                    return (
                        <AccordionItem
                            key={section.key}
                            value={section.key}
                            className={`border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow ${section.isCritical ? 'border-amber-200 bg-amber-50/30' : ''
                                }`}
                        >
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${isComplete
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : section.isCritical
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {isComplete ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Icon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <SectionStatus complete={isComplete} label={section.title} isCritical={section.isCritical} />
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                {SectionRenderer && (
                                    <SectionRenderer
                                        data={formData}
                                        onChange={handleChange}
                                        disabled={isDisabled}
                                        {...(section.key === 'safety' ? { procedureName: response.procedureName, side: response.side } : {})}
                                    />
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* ── Bottom Action Bar ──────────────────────────────── */}
            {
                !isFinalized && (
                    <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t py-3 px-4 -mx-4 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
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
                                className="bg-emerald-600 hover:bg-emerald-700"
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
                                Finalize
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* ── Finalize Confirmation Dialog ───────────────────── */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalize Intra-Op Record?</DialogTitle>
                        <DialogDescription>
                            This will lock the intra-operative record and record your digital signature.
                            All required fields including final counts and sign-out must be completed.
                            The record cannot be edited after finalization.
                        </DialogDescription>
                    </DialogHeader>
                    {hasDiscrepancy && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 font-medium">
                                ⚠ Count discrepancy is flagged. Ensure discrepancy notes are documented.
                            </p>
                        </div>
                    )}
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
        </div >
    );
}
