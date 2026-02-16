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
    ImplantUsedItem,
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
    Settings,
    Hash,
    FlaskConical,
    Package,
    ClipboardCheck,
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

function TheatreSetupSection({ data, onChange, disabled }: SectionProps) {
    const d = data.theatreSetup ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, theatreSetup: { ...d, [field]: value } });

    return (
        <div className="space-y-5">
            {/* Core Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Patient Positioning" value={d.positioning} onChange={(v) => set('positioning', v)} disabled={disabled} />
                <TextField label="Skin Prep Agent" value={d.skinPrepAgent} onChange={(v) => set('skinPrepAgent', v)} disabled={disabled} />
                <TextField label="Drape Type" value={d.drapeType} onChange={(v) => set('drapeType', v)} disabled={disabled} />
                <div className="space-y-1.5">
                    <Label className="text-sm">Wound Classification</Label>
                    <Select
                        value={d.woundClass || ''}
                        onValueChange={(v) => set('woundClass', v)}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select wound class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CLEAN">Clean</SelectItem>
                            <SelectItem value="CLEAN_CONTAMINATED">Clean-Contaminated</SelectItem>
                            <SelectItem value="CONTAMINATED">Contaminated</SelectItem>
                            <SelectItem value="DIRTY_INFECTED">Dirty / Infected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator />

            {/* Tourniquet */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Switch checked={!!d.tourniquetUsed} onCheckedChange={(v) => set('tourniquetUsed', v)} disabled={disabled} />
                    <Label className="text-sm font-medium">Tourniquet Used</Label>
                </div>
                {d.tourniquetUsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-8 animate-in slide-in-from-top-2 duration-200">
                        <NumberField label="Pressure" value={d.tourniquetPressure} onChange={(v) => set('tourniquetPressure', v)} min={0} max={500} unit="mmHg" disabled={disabled} />
                        <TimeField label="Time On" value={d.tourniquetTimeOn} onChange={(v) => set('tourniquetTimeOn', v)} disabled={disabled} />
                        <TimeField label="Time Off" value={d.tourniquetTimeOff} onChange={(v) => set('tourniquetTimeOff', v)} disabled={disabled} />
                    </div>
                )}
            </div>

            <Separator />

            {/* Cautery */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Switch checked={!!d.cauteryUsed} onCheckedChange={(v) => set('cauteryUsed', v)} disabled={disabled} />
                    <Label className="text-sm font-medium">Cautery / Diathermy Used</Label>
                </div>
                {d.cauteryUsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8 animate-in slide-in-from-top-2 duration-200">
                        <TextField label="Cut Setting" value={d.cauterySettingsCut} onChange={(v) => set('cauterySettingsCut', v)} disabled={disabled} />
                        <TextField label="Coag Setting" value={d.cauterySettingsCoag} onChange={(v) => set('cauterySettingsCoag', v)} disabled={disabled} />
                    </div>
                )}
            </div>

            <Separator />

            {/* Drains */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Switch checked={!!d.drainsUsed} onCheckedChange={(v) => set('drainsUsed', v)} disabled={disabled} />
                    <Label className="text-sm font-medium">Drains Used</Label>
                </div>
                {d.drainsUsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8 animate-in slide-in-from-top-2 duration-200">
                        <TextField label="Drain Type" value={d.drainType} onChange={(v) => set('drainType', v)} disabled={disabled} />
                        <TextField label="Drain Location" value={d.drainLocation} onChange={(v) => set('drainLocation', v)} disabled={disabled} />
                    </div>
                )}
            </div>

            <Separator />

            {/* Irrigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Irrigation Type" value={d.irrigationType} onChange={(v) => set('irrigationType', v)} disabled={disabled} />
                <NumberField label="Irrigation Volume" value={d.irrigationVolumeMl} onChange={(v) => set('irrigationVolumeMl', v)} min={0} unit="mL" disabled={disabled} />
            </div>
        </div>
    );
}

function CountsSection({ data, onChange, disabled }: SectionProps) {
    const d = data.counts ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, counts: { ...d, [field]: value } });

    const hasDiscrepancy = !!d.countDiscrepancy;
    const hasMismatch = (init?: number, final?: number) =>
        init !== undefined && final !== undefined && init !== final;

    return (
        <div className="space-y-6">
            {/* Count Discrepancy Warning */}
            {hasDiscrepancy && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in duration-300">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">⚠ COUNT DISCREPANCY FLAGGED</p>
                        <p className="text-xs text-red-600 mt-0.5">
                            A discrepancy has been identified. This must be resolved and documented before the case can proceed to RECOVERY.
                        </p>
                    </div>
                </div>
            )}

            {/* Initial Counts */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Initial Counts
                </h4>
                <BooleanField label="Initial counts completed" value={d.initialCountsCompleted} onChange={(v) => set('initialCountsCompleted', v)} disabled={disabled} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Recorded by" value={d.initialCountsRecordedBy} onChange={(v) => set('initialCountsRecordedBy', v)} disabled={disabled} />
                    <TimeField label="Time" value={d.initialCountsTime} onChange={(v) => set('initialCountsTime', v)} disabled={disabled} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <NumberField label="Swabs" value={d.swabsInitial} onChange={(v) => set('swabsInitial', v)} min={0} disabled={disabled} />
                    <NumberField label="Sharps" value={d.sharpsInitial} onChange={(v) => set('sharpsInitial', v)} min={0} disabled={disabled} />
                    <NumberField label="Instruments" value={d.instrumentsInitial} onChange={(v) => set('instrumentsInitial', v)} min={0} disabled={disabled} />
                </div>
            </div>

            <Separator />

            {/* Final Counts */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Final Counts
                </h4>
                <BooleanField label="Final counts completed" value={d.finalCountsCompleted} onChange={(v) => set('finalCountsCompleted', v)} disabled={disabled} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Recorded by" value={d.finalCountsRecordedBy} onChange={(v) => set('finalCountsRecordedBy', v)} disabled={disabled} />
                    <TimeField label="Time" value={d.finalCountsTime} onChange={(v) => set('finalCountsTime', v)} disabled={disabled} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <NumberField label="Swabs" value={d.swabsFinal} onChange={(v) => set('swabsFinal', v)} min={0} disabled={disabled} />
                        {hasMismatch(d.swabsInitial, d.swabsFinal) && (
                            <p className="text-xs text-amber-600 mt-1">⚠ Mismatch: initial {d.swabsInitial} ≠ final {d.swabsFinal}</p>
                        )}
                    </div>
                    <div>
                        <NumberField label="Sharps" value={d.sharpsFinal} onChange={(v) => set('sharpsFinal', v)} min={0} disabled={disabled} />
                        {hasMismatch(d.sharpsInitial, d.sharpsFinal) && (
                            <p className="text-xs text-amber-600 mt-1">⚠ Mismatch: initial {d.sharpsInitial} ≠ final {d.sharpsFinal}</p>
                        )}
                    </div>
                    <div>
                        <NumberField label="Instruments" value={d.instrumentsFinal} onChange={(v) => set('instrumentsFinal', v)} min={0} disabled={disabled} />
                        {hasMismatch(d.instrumentsInitial, d.instrumentsFinal) && (
                            <p className="text-xs text-amber-600 mt-1">⚠ Mismatch: initial {d.instrumentsInitial} ≠ final {d.instrumentsFinal}</p>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            {/* Discrepancy */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Switch
                        checked={!!d.countDiscrepancy}
                        onCheckedChange={(v) => set('countDiscrepancy', v)}
                        disabled={disabled}
                        className={hasDiscrepancy ? 'data-[state=checked]:bg-red-500' : ''}
                    />
                    <Label className="text-sm font-medium">Count Discrepancy</Label>
                </div>
                {hasDiscrepancy && (
                    <div className="pl-8 animate-in slide-in-from-top-2 duration-200">
                        <Label className="text-sm text-red-700">Discrepancy Notes (required)</Label>
                        <textarea
                            className="mt-1.5 w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50"
                            rows={3}
                            value={d.discrepancyNotes || ''}
                            onChange={(e) => set('discrepancyNotes', e.target.value)}
                            disabled={disabled}
                            placeholder="Describe the discrepancy, actions taken, and resolution..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function SpecimensSection({ data, onChange, disabled }: SectionProps) {
    const specimens = data.specimens?.specimens ?? [];
    const setSpecimens = (newSpecimens: Partial<SpecimenItem>[]) =>
        onChange({ ...data, specimens: { ...data.specimens, specimens: newSpecimens as SpecimenItem[] } });

    const addSpecimen = () => {
        setSpecimens([...specimens, { specimenType: '', site: '', destinationLab: '', timeSent: '', notes: '' }]);
    };

    const removeSpecimen = (index: number) => {
        setSpecimens(specimens.filter((_, i) => i !== index));
    };

    const updateSpecimen = (index: number, field: string, value: string) => {
        const updated = [...specimens];
        updated[index] = { ...updated[index], [field]: value };
        setSpecimens(updated);
    };

    return (
        <div className="space-y-4">
            {specimens.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No specimens recorded yet.</p>
            )}
            {specimens.map((specimen, idx) => (
                <div key={idx} className="relative border rounded-lg p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Specimen #{idx + 1}
                        </span>
                        {!disabled && (
                            <Button variant="ghost" size="sm" onClick={() => removeSpecimen(idx)} className="h-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextField label="Specimen Type" value={specimen.specimenType} onChange={(v) => updateSpecimen(idx, 'specimenType', v)} disabled={disabled} />
                        <TextField label="Site" value={specimen.site} onChange={(v) => updateSpecimen(idx, 'site', v)} disabled={disabled} />
                        <TextField label="Destination Lab" value={specimen.destinationLab} onChange={(v) => updateSpecimen(idx, 'destinationLab', v)} disabled={disabled} />
                        <TimeField label="Time Sent" value={specimen.timeSent} onChange={(v) => updateSpecimen(idx, 'timeSent', v)} disabled={disabled} />
                    </div>
                    <TextField label="Notes" value={specimen.notes} onChange={(v) => updateSpecimen(idx, 'notes', v)} disabled={disabled} />
                </div>
            ))}
            {!disabled && (
                <Button variant="outline" size="sm" onClick={addSpecimen} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Specimen
                </Button>
            )}
        </div>
    );
}

function ImplantsUsedSection({ data, onChange, disabled }: SectionProps) {
    const d = data.implantsUsed ?? {};
    const items = d.items ?? [];
    const setImplantsUsed = (updates: Partial<typeof d>) =>
        onChange({ ...data, implantsUsed: { ...d, ...updates } });

    const addImplant = () => {
        setImplantsUsed({
            items: [...items, { name: '', manufacturer: '', lotNumber: '', serialNumber: '', expiryDate: '', used: true, notes: '' }],
        });
    };

    const removeImplant = (index: number) => {
        setImplantsUsed({ items: items.filter((_, i) => i !== index) });
    };

    const updateImplant = (index: number, field: string, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setImplantsUsed({ items: updated });
    };

    return (
        <div className="space-y-4">
            <BooleanField
                label="Implants / prostheses confirmed with surgical team"
                value={d.implantsConfirmed}
                onChange={(v) => setImplantsUsed({ implantsConfirmed: v })}
                disabled={disabled}
            />

            <Separator />

            {items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No implants recorded.</p>
            )}
            {items.map((item, idx) => (
                <div key={idx} className="relative border rounded-lg p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Implant #{idx + 1}
                        </span>
                        {!disabled && (
                            <Button variant="ghost" size="sm" onClick={() => removeImplant(idx)} className="h-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextField label="Implant Name" value={item.name} onChange={(v) => updateImplant(idx, 'name', v)} disabled={disabled} />
                        <TextField label="Manufacturer" value={item.manufacturer} onChange={(v) => updateImplant(idx, 'manufacturer', v)} disabled={disabled} />
                        <TextField label="Lot Number" value={item.lotNumber} onChange={(v) => updateImplant(idx, 'lotNumber', v)} disabled={disabled} />
                        <TextField label="Serial Number" value={item.serialNumber} onChange={(v) => updateImplant(idx, 'serialNumber', v)} disabled={disabled} />
                        <TextField label="Expiry Date" value={item.expiryDate} onChange={(v) => updateImplant(idx, 'expiryDate', v)} placeholder="YYYY-MM-DD" disabled={disabled} />
                        <div className="flex items-center gap-3 pt-6">
                            <Switch checked={!!item.used} onCheckedChange={(v) => updateImplant(idx, 'used', v)} disabled={disabled} />
                            <Label className="text-sm">Used in procedure</Label>
                        </div>
                    </div>
                    <TextField label="Notes" value={item.notes} onChange={(v) => updateImplant(idx, 'notes', v)} disabled={disabled} />
                </div>
            ))}
            {!disabled && (
                <Button variant="outline" size="sm" onClick={addImplant} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Implant
                </Button>
            )}
        </div>
    );
}

function SignOutSection({ data, onChange, disabled }: SectionProps) {
    const d = data.signOut ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, signOut: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">WHO Surgical Safety Sign-Out</p>
                <p className="text-xs text-blue-600 mt-0.5">
                    Confirm all sign-out items before the patient leaves the operating theatre.
                </p>
            </div>

            <BooleanField label="Sign-Out completed" value={d.signOutCompleted} onChange={(v) => set('signOutCompleted', v)} disabled={disabled} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TimeField label="Sign-Out Time" value={d.signOutTime} onChange={(v) => set('signOutTime', v)} disabled={disabled} />
                <TextField label="Nurse Name (for sign-out)" value={d.signOutNurseName} onChange={(v) => set('signOutNurseName', v)} disabled={disabled} />
            </div>

            <Separator />

            <BooleanField label="Post-operative instructions confirmed with team" value={d.postopInstructionsConfirmed} onChange={(v) => set('postopInstructionsConfirmed', v)} disabled={disabled} />
            <BooleanField label="All specimens correctly labeled" value={d.specimensLabeledConfirmed} onChange={(v) => set('specimensLabeledConfirmed', v)} disabled={disabled} />

            <Separator />

            <div className="space-y-1.5">
                <Label className="text-sm">Additional Notes</Label>
                <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50"
                    rows={3}
                    value={d.additionalNotes || ''}
                    onChange={(e) => set('additionalNotes', e.target.value)}
                    disabled={disabled}
                    placeholder="Any other notes for the intra-operative record..."
                />
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Section renderers map
// ──────────────────────────────────────────────────────────────────────

const SECTION_RENDERERS: Record<string, React.FC<SectionProps>> = {
    theatreSetup: TheatreSetupSection,
    counts: CountsSection,
    specimens: SpecimensSection,
    implantsUsed: ImplantsUsedSection,
    signOut: SignOutSection,
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
                                        className={`rounded-md border px-2.5 py-2 ${
                                            value
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
        theatreSetup: {},
        counts: {},
        specimens: {},
        implantsUsed: {},
        signOut: {},
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
    const hasDiscrepancy = !!(formData.counts as any)?.countDiscrepancy;

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
            <Button variant="ghost" size="sm" asChild>
                <Link href="/nurse/dashboard">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
            </Button>

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
                    {patient.allergies && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">
                                <strong>Allergies:</strong> {patient.allergies}
                            </p>
                        </div>
                    )}

                    {/* Count discrepancy global alert */}
                    {hasDiscrepancy && !isFinalized && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">
                                <strong>Count Discrepancy:</strong> A swab/instrument/sharps count discrepancy has been flagged. This will block transition to RECOVERY until resolved.
                            </p>
                        </div>
                    )}

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
                    {isFinalized && response.form?.signedAt && (
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Finalized on {format(new Date(response.form.signedAt), 'MMM d, yyyy HH:mm')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Title + Actions ─────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Intra-Operative Nurse Record</h2>
                {!isFinalized && (
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
                )}
            </div>

            {/* ── Operative Timeline Panel ──────────────────────── */}
            <OperativeTimelinePanel caseId={caseId} userRole={user?.role || ''} />

            {/* ── Accordion Sections ─────────────────────────────── */}
            <Accordion type="multiple" defaultValue={INTRAOP_SECTIONS.map((s) => s.key)} className="space-y-3">
                {INTRAOP_SECTIONS.map((section) => {
                    const SectionRenderer = SECTION_RENDERERS[section.key];
                    const Icon = SECTION_ICONS[section.icon] || Circle;
                    const completion = sectionCompletion[section.key];
                    const isComplete = completion?.complete ?? false;

                    return (
                        <AccordionItem
                            key={section.key}
                            value={section.key}
                            className={`border rounded-lg px-4 data-[state=open]:shadow-sm transition-shadow ${
                                section.isCritical ? 'border-amber-200 bg-amber-50/30' : ''
                            }`}
                        >
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                                        isComplete
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
                                    />
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* ── Bottom Action Bar ──────────────────────────────── */}
            {!isFinalized && (
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
            )}

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
        </div>
    );
}
