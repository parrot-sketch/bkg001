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
import { CHECKLIST_SECTIONS } from '@/domain/clinical-forms/NursePreopWardChecklist';
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
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MedicationAdministrationList } from '@/components/nurse/MedicationAdministrationList';

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
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Hb / PCV" value={d.hbPcv} onChange={(v) => set('hbPcv', v)} disabled={disabled} />
            <TextField label="UECs" value={d.uecs} onChange={(v) => set('uecs', v)} disabled={disabled} />
            <NumberField label="X-match units available" value={d.xMatchUnitsAvailable} onChange={(v) => set('xMatchUnitsAvailable', v)} min={0} disabled={disabled} />
            <TextField label="Other lab results / notes" value={d.otherLabResults} onChange={(v) => set('otherLabResults', v)} disabled={disabled} />
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
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-destructive">Known Allergies (from patient record)</p>
                        <p className="text-sm text-destructive/80">{patientAllergies}</p>
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
    return (
        <div className="space-y-3">
            <BooleanField label="Bath / shower and gown" value={d.bathGown} onChange={(v) => set('bathGown', v)} disabled={disabled} />
            <BooleanField label="Shave / skin prep done" value={d.shaveSkinPrep} onChange={(v) => set('shaveSkinPrep', v)} disabled={disabled} />
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
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="BP Systolic" value={d.bpSystolic} onChange={(v) => set('bpSystolic', v)} min={60} max={260} unit="mmHg" disabled={disabled} />
                <NumberField label="BP Diastolic" value={d.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} min={30} max={160} unit="mmHg" disabled={disabled} />
                <NumberField label="Pulse" value={d.pulse} onChange={(v) => set('pulse', v)} min={30} max={220} unit="bpm" disabled={disabled} />
                <NumberField label="Respiratory Rate" value={d.respiratoryRate} onChange={(v) => set('respiratoryRate', v)} min={6} max={60} unit="/min" disabled={disabled} />
                <NumberField label="Temperature" value={d.temperature} onChange={(v) => set('temperature', v)} min={34} max={42} step={0.1} unit="°C" disabled={disabled} />
                <TextField label="CVP (if applicable)" value={d.cvp} onChange={(v) => set('cvp', v)} disabled={disabled} />
            </div>
            <Separator />
            <BooleanField label="Bladder emptied" value={d.bladderEmptied} onChange={(v) => set('bladderEmptied', v)} disabled={disabled} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField label="Height" value={d.height} onChange={(v) => set('height', v)} min={50} max={250} unit="cm" disabled={disabled} />
                <NumberField label="Weight" value={d.weight} onChange={(v) => set('weight', v)} min={2} max={350} unit="kg" disabled={disabled} />
            </div>
            <Separator />
            <TextField label="Urinalysis results" value={d.urinalysis} onChange={(v) => set('urinalysis', v)} disabled={disabled} />
            <BooleanField label="X-rays / scans present" value={d.xRaysScansPresent} onChange={(v) => set('xRaysScansPresent', v)} disabled={disabled} />
            <TextField label="Other forms required / notes" value={d.otherFormsRequired} onChange={(v) => set('otherFormsRequired', v)} disabled={disabled} />
        </div>
    );
}

function HandoverSection({ data, onChange, disabled }: SectionProps) {
    const d = data.handover ?? {};
    const set = (field: string, value: any) => onChange({ ...data, handover: { ...d, [field]: value } });
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Prepared by (name)" value={d.preparedByName} onChange={(v) => set('preparedByName', v)} disabled={disabled} />
            <TimeField label="Time arrived in theatre" value={d.timeArrivedInTheatre} onChange={(v) => set('timeArrivedInTheatre', v)} disabled={disabled} />
            <TextField label="Received by (name)" value={d.receivedByName} onChange={(v) => set('receivedByName', v)} disabled={disabled} />
            <TextField label="Handed over by (name)" value={d.handedOverByName} onChange={(v) => set('handedOverByName', v)} disabled={disabled} />
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
    const handleChange = useCallback((newData: NursePreopWardChecklistDraft) => {
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
                                    // Save first, then finalize
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
                            Finalize Checklist
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
        </div>
    );
}
