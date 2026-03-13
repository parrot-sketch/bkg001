'use client';

/**
 * Nurse Immediate Recovery Care Record Page
 *
 * Full-page clinical form for immediate post-operative recovery monitoring.
 * Sections: Handover, Observations, Checklists, Pain, Fluids, Drugs, Specimen, Handoff.
 *
 * Features:
 * - Explicit save (nurse clicks "Save Draft")
 * - Section-level completion indicators
 * - Time-series observations table with add/remove rows
 * - "Finalize Record" with validation
 * - Locked read-only view after finalization
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import {
    useImmediateRecoveryCareRecord,
    useSaveImmediateRecoveryCareRecord,
    useFinalizeImmediateRecoveryCareRecord,
} from '@/hooks/nurse/useImmediateRecoveryCareRecord';
import type {
    ImmediateRecoveryCareRecordDraft,
    ObservationEntry,
    RecoveryChecklist,
    NauseaVomiting,
    PainAssessment,
    FluidsOutput,
    DrugAdministered,
    Specimen,
    Handover,
    RecoveryRoomHandover,
    WardRecipient,
} from '@/domain/clinical-forms/ImmediateRecoveryCareRecord';
import { RECOVERY_CARE_SECTIONS } from '@/domain/clinical-forms/ImmediateRecoveryCareRecord';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
    User2,
    ShieldAlert,
    Activity,
    Droplet,
    Pill,
    TestTube,
    ArrowRight,
    Plus,
    Trash2,
    HeartPulse,
    Siren,
    Bandage,
    CheckSquare,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { UserSelect } from '@/components/ui/user-select';

// ──────────────────────────────────────────────────────────────────────
// Icon Map
// ──────────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
    handover: User2,
    observations: Activity,
    checklists: CheckSquare,
    nausea_vomiting: Siren,
    pain: Bandage,
    fluids_and_output: Droplet,
    drugs_administered: Pill,
    specimen: TestTube,
    handoff: ArrowRight,
};

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

interface SectionCompletion {
    key: string;
    complete: boolean;
    requiredFields: number;
    filledFields: number;
}

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────

export default function ImmediateRecoveryCarePage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;
    const { user } = useAuth();

    const [data, setData] = useState<ImmediateRecoveryCareRecordDraft>({
        handover: {},
        observations: [],
        checklists: {},
        nausea_vomiting: {},
        pain: {},
        fluids_and_output: {},
        drugs_administered: [],
        specimen: {},
        comments: '',
        recommended_position: '',
        recovery_room_handover: {},
        ward_recipient: {},
    });

    const [isLoading, setIsLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
    const [amendmentDialogOpen, setAmendmentDialogOpen] = useState(false);
    const [amendmentReason, setAmendmentReason] = useState('');

    const { data: record, isLoading: recordLoading, error } = useImmediateRecoveryCareRecord(caseId);
    const saveMutation = useSaveImmediateRecoveryCareRecord(caseId);
    const finalizeMutation = useFinalizeImmediateRecoveryCareRecord(caseId);

    const disabled = record?.status === 'FINAL';

    // Load existing data
    useEffect(() => {
        if (record?.data) {
            setData(record.data as ImmediateRecoveryCareRecordDraft);
        }
        setIsLoading(false);
    }, [record]);

    // Compute section completion
    const sectionCompletion = useCallback((): SectionCompletion[] => {
        return RECOVERY_CARE_SECTIONS.map((section) => {
            let complete = false;
            let filledFields = 0;

            switch (section.key) {
                case 'handover':
                    complete = !!data.handover?.handover_given_by;
                    filledFields = data.handover?.handover_given_by ? 1 : 0;
                    break;
                case 'observations':
                    complete = data.observations && data.observations.length > 0;
                    filledFields = data.observations?.length || 0;
                    break;
                case 'checklists':
                    const cl = data.checklists || {};
                    complete = !!(cl.airway_ett_removed && cl.wound_dressing_checked);
                    filledFields = [cl.airway_ett_removed, cl.wound_dressing_checked, cl.bleeding, cl.drains_present].filter(Boolean).length;
                    break;
                case 'handoff':
                    complete = !!(data.recovery_room_handover?.transferred_by && data.recovery_room_handover?.receiving_nurse);
                    filledFields = [data.recovery_room_handover?.transferred_by, data.recovery_room_handover?.receiving_nurse, data.recovery_room_handover?.time].filter(Boolean).length;
                    break;
                default:
                    complete = true;
            }

            return {
                key: section.key,
                complete,
                requiredFields: section.requiredFieldCount,
                filledFields,
            };
        });
    }, [data]);

    const completedSections = sectionCompletion().filter((s) => s.complete).length;
    const totalSections = RECOVERY_CARE_SECTIONS.length;
    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    // Handlers
    const handleSave = async () => {
        setSaveLoading(true);
        try {
            await saveMutation.mutateAsync({ data });
        } finally {
            setSaveLoading(false);
        }
    };

    const handleFinalize = async () => {
        try {
            await finalizeMutation.mutateAsync();
            setFinalizeDialogOpen(false);
        } catch (err: any) {
            alert(err.message || 'Failed to finalize');
        }
    };

    const set = useCallback((path: string, value: any) => {
        setData((prev) => {
            const newData = { ...prev };
            const keys = path.split('.');
            let obj: any = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                obj[keys[i]] = obj[keys[i]] || {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            return newData;
        });
    }, []);

    // Observation row handlers
    const addObservation = () => {
        setData((prev) => ({
            ...prev,
            observations: [...(prev.observations || []), { 
                time: '',
                airway: '',
                level_of_consciousness: '',
                head_lift: '',
                limb_observations: '',
            } as ObservationEntry],
        }));
    };

    const removeObservation = (index: number) => {
        setData((prev) => ({
            ...prev,
            observations: (prev.observations || []).filter((_, i) => i !== index),
        }));
    };

    const updateObservation = (index: number, field: string, value: any) => {
        setData((prev) => {
            const obs = [...(prev.observations || [])];
            obs[index] = { ...obs[index], [field]: value };
            return { ...prev, observations: obs };
        });
    };

    // Drug row handlers
    const addDrug = () => {
        setData((prev) => ({
            ...prev,
            drugs_administered: [...(prev.drugs_administered || []), {}],
        }));
    };

    const removeDrug = (index: number) => {
        setData((prev) => ({
            ...prev,
            drugs_administered: (prev.drugs_administered || []).filter((_, i) => i !== index),
        }));
    };

    const updateDrug = (index: number, field: string, value: any) => {
        setData((prev) => {
            const drugs = [...(prev.drugs_administered || [])];
            drugs[index] = { ...drugs[index], [field]: value };
            return { ...prev, drugs_administered: drugs };
        });
    };

    if (recordLoading || isLoading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-red-500">Error loading record: {(error as Error).message}</p>
                        <Button onClick={() => router.back()} className="mt-4">
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={`/nurse/dashboard`}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                            <div>
                                <h1 className="text-xl font-semibold">Immediate Recovery Care Record</h1>
                                <p className="text-sm text-slate-500">
                                    Case: {caseId} • {disabled ? 'Finalized' : 'Draft'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!disabled && (
                                <Button onClick={handleSave} disabled={saveLoading}>
                                    {saveLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Draft
                                </Button>
                            )}
                            {disabled && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    <Lock className="h-3 w-3 mr-1" /> Finalized
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-slate-500 mt-1">
                            {completedSections}/{totalSections} sections complete
                        </p>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                <Accordion type="multiple" defaultValue={RECOVERY_CARE_SECTIONS.map(s => s.key)} className="space-y-4">
                    {/* Handover from Theater */}
                    <AccordionItem value="handover">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.handover && <SECTION_ICONS.handover className="h-5 w-5 text-blue-500" />}
                                <span className="font-medium">Handover from Theater</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Handover Given By *</Label>
                                    <Input
                                        value={data.handover?.handover_given_by || ''}
                                        onChange={(e) => set('handover.handover_given_by', e.target.value)}
                                        disabled={disabled}
                                        placeholder="Doctor/nurse name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={data.handover?.time || ''}
                                        onChange={(e) => set('handover.time', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Patient Position</Label>
                                    <Input
                                        value={data.handover?.patient_position || ''}
                                        onChange={(e) => set('handover.patient_position', e.target.value)}
                                        disabled={disabled}
                                        placeholder="Supine, Prone, etc."
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Observations */}
                    <AccordionItem value="observations">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.observations && <SECTION_ICONS.observations className="h-5 w-5 text-red-500" />}
                                <span className="font-medium">Observations *</span>
                                <Badge variant="outline">{data.observations?.length || 0} entries</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                            {!disabled && (
                                <Button variant="outline" size="sm" onClick={addObservation} className="mb-4">
                                    <Plus className="h-4 w-4 mr-2" /> Add Observation
                                </Button>
                            )}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="p-2 text-left border">Time</th>
                                            <th className="p-2 text-left border">Airway</th>
                                            <th className="p-2 text-left border">O2 Flow</th>
                                            <th className="p-2 text-left border">RR</th>
                                            <th className="p-2 text-left border">Pulse</th>
                                            <th className="p-2 text-left border">Temp</th>
                                            <th className="p-2 text-left border">BP Sys/Dia</th>
                                            <th className="p-2 text-left border">SpO2</th>
                                            <th className="p-2 text-left border">LOC</th>
                                            <th className="p-2 text-left border">Head Lift</th>
                                            {!disabled && <th className="p-2 border"></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.observations || []).map((obs, idx) => (
                                            <tr key={idx}>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="time"
                                                        value={obs.time || ''}
                                                        onChange={(e) => updateObservation(idx, 'time', e.target.value)}
                                                        disabled={disabled}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        value={obs.airway || ''}
                                                        onChange={(e) => updateObservation(idx, 'airway', e.target.value)}
                                                        disabled={disabled}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="number"
                                                        value={obs.o2_flow_l_min || ''}
                                                        onChange={(e) => updateObservation(idx, 'o2_flow_l_min', e.target.value ? Number(e.target.value) : undefined)}
                                                        disabled={disabled}
                                                        className="h-8 w-16"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="number"
                                                        value={obs.respiratory_rate || ''}
                                                        onChange={(e) => updateObservation(idx, 'respiratory_rate', e.target.value ? Number(e.target.value) : undefined)}
                                                        disabled={disabled}
                                                        className="h-8 w-14"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="number"
                                                        value={obs.pulse || ''}
                                                        onChange={(e) => updateObservation(idx, 'pulse', e.target.value ? Number(e.target.value) : undefined)}
                                                        disabled={disabled}
                                                        className="h-8 w-14"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        value={obs.temperature || ''}
                                                        onChange={(e) => updateObservation(idx, 'temperature', e.target.value ? Number(e.target.value) : undefined)}
                                                        disabled={disabled}
                                                        className="h-8 w-16"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <div className="flex gap-1">
                                                        <Input
                                                            type="number"
                                                            placeholder="Sys"
                                                            value={obs.bpSystolic || ''}
                                                            onChange={(e) => updateObservation(idx, 'bpSystolic', e.target.value ? Number(e.target.value) : undefined)}
                                                            disabled={disabled}
                                                            className="h-8 w-12"
                                                        />
                                                        <Input
                                                            type="number"
                                                            placeholder="Dia"
                                                            value={obs.bpDiastolic || ''}
                                                            onChange={(e) => updateObservation(idx, 'bpDiastolic', e.target.value ? Number(e.target.value) : undefined)}
                                                            disabled={disabled}
                                                            className="h-8 w-12"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-1 border">
                                                    <Input
                                                        type="number"
                                                        value={obs.oxygen_saturation || ''}
                                                        onChange={(e) => updateObservation(idx, 'oxygen_saturation', e.target.value ? Number(e.target.value) : undefined)}
                                                        disabled={disabled}
                                                        className="h-8 w-14"
                                                    />
                                                </td>
                                                <td className="p-1 border">
                                                    <Select
                                                        value={obs.level_of_consciousness || ''}
                                                        onValueChange={(v) => updateObservation(idx, 'level_of_consciousness', v)}
                                                        disabled={disabled}
                                                    >
                                                        <SelectTrigger className="h-8 w-24">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Alert">Alert</SelectItem>
                                                            <SelectItem value="Voice">Voice</SelectItem>
                                                            <SelectItem value="Pain">Pain</SelectItem>
                                                            <SelectItem value="Unresponsive">Unresponsive</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="p-1 border">
                                                    <Select
                                                        value={obs.head_lift || ''}
                                                        onValueChange={(v) => updateObservation(idx, 'head_lift', v)}
                                                        disabled={disabled}
                                                    >
                                                        <SelectTrigger className="h-8 w-20">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                {!disabled && (
                                                    <td className="p-1 border">
                                                        <Button variant="ghost" size="icon" onClick={() => removeObservation(idx)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(!data.observations || data.observations.length === 0) && (
                                <p className="text-center text-slate-500 py-4">No observations recorded yet</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Clinical Checklists */}
                    <AccordionItem value="checklists">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.checklists && <SECTION_ICONS.checklists className="h-5 w-5 text-amber-500" />}
                                <span className="font-medium">Clinical Checklists</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'airway_ett_removed', label: 'Airway ETT Removed' },
                                    { key: 'wound_dressing_checked', label: 'Wound Dressing Checked' },
                                    { key: 'bleeding', label: 'Bleeding' },
                                    { key: 'wound_packs_removed', label: 'Wound Packs Removed' },
                                    { key: 'drains_present', label: 'Drains Present' },
                                    { key: 'implants_present', label: 'Implants Present' },
                                    { key: 'x_rays_present', label: 'X-Rays Present' },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center gap-2">
                                        <Select
                                            value={(data.checklists as any)?.[item.key as keyof RecoveryChecklist] || ''}
                                            onValueChange={(v) => set(`checklists.${item.key}`, v)}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={item.label} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="YES">YES</SelectItem>
                                                <SelectItem value="NO">NO</SelectItem>
                                                <SelectItem value="N/A">N/A</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Nausea & Vomiting */}
                    <AccordionItem value="nausea_vomiting">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.nausea_vomiting && <SECTION_ICONS.nausea_vomiting className="h-5 w-5 text-purple-500" />}
                                <span className="font-medium">Nausea & Vomiting</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Score (0-5)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={5}
                                        value={data.nausea_vomiting?.score ?? ''}
                                        onChange={(e) => set('nausea_vomiting.score', e.target.value ? Number(e.target.value) : undefined)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <Checkbox
                                        id="ponv_med"
                                        checked={data.nausea_vomiting?.ponv_medication_given || false}
                                        onCheckedChange={(v) => set('nausea_vomiting.ponv_medication_given', v === true)}
                                        disabled={disabled}
                                    />
                                    <Label htmlFor="ponv_med">Medication Given</Label>
                                </div>
                                {data.nausea_vomiting?.ponv_medication_given && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Medication</Label>
                                            <Input
                                                value={data.nausea_vomiting?.ponv_medication_specify || ''}
                                                onChange={(e) => set('nausea_vomiting.ponv_medication_specify', e.target.value)}
                                                disabled={disabled}
                                                placeholder="Medication name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time</Label>
                                            <Input
                                                type="time"
                                                value={data.nausea_vomiting?.ponv_medication_time || ''}
                                                onChange={(e) => set('nausea_vomiting.ponv_medication_time', e.target.value)}
                                                disabled={disabled}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Pain Assessment */}
                    <AccordionItem value="pain">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.pain && <SECTION_ICONS.pain className="h-5 w-5 text-orange-500" />}
                                <span className="font-medium">Pain Assessment</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Pain Score (0-10)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={data.pain?.pain_score ?? ''}
                                        onChange={(e) => set('pain.pain_score', e.target.value ? Number(e.target.value) : undefined)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <Checkbox
                                        id="analgesia"
                                        checked={data.pain?.analgesia_given || false}
                                        onCheckedChange={(v) => set('pain.analgesia_given', v === true)}
                                        disabled={disabled}
                                    />
                                    <Label htmlFor="analgesia">Analgesia Given</Label>
                                </div>
                                {data.pain?.analgesia_given && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Analgesia</Label>
                                            <Input
                                                value={data.pain?.analgesia_specify || ''}
                                                onChange={(e) => set('pain.analgesia_specify', e.target.value)}
                                                disabled={disabled}
                                                placeholder="Analgesia name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time</Label>
                                            <Input
                                                type="time"
                                                value={data.pain?.analgesia_time || ''}
                                                onChange={(e) => set('pain.analgesia_time', e.target.value)}
                                                disabled={disabled}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Fluids & Output */}
                    <AccordionItem value="fluids_and_output">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.fluids_and_output && <SECTION_ICONS.fluids_and_output className="h-5 w-5 text-cyan-500" />}
                                <span className="font-medium">IV Fluids & Output</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IV Fluids Regime</Label>
                                    <Input
                                        value={data.fluids_and_output?.iv_fluids_regime || ''}
                                        onChange={(e) => set('fluids_and_output.iv_fluids_regime', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IV Fluids Amount</Label>
                                    <Input
                                        value={data.fluids_and_output?.iv_fluids_amount || ''}
                                        onChange={(e) => set('fluids_and_output.iv_fluids_amount', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Urine Output (ml/kg/hr)</Label>
                                    <Input
                                        type="number"
                                        value={data.fluids_and_output?.urine_output_ml_kg_hr ?? ''}
                                        onChange={(e) => set('fluids_and_output.urine_output_ml_kg_hr', e.target.value ? Number(e.target.value) : undefined)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Drains Output</Label>
                                    <Input
                                        value={data.fluids_and_output?.drains_output || ''}
                                        onChange={(e) => set('fluids_and_output.drains_output', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Output</Label>
                                    <Input
                                        value={data.fluids_and_output?.total_output || ''}
                                        onChange={(e) => set('fluids_and_output.total_output', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Drugs Administered */}
                    <AccordionItem value="drugs_administered">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.drugs_administered && <SECTION_ICONS.drugs_administered className="h-5 w-5 text-indigo-500" />}
                                <span className="font-medium">Drugs Administered</span>
                                <Badge variant="outline">{data.drugs_administered?.length || 0}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                            {!disabled && (
                                <Button variant="outline" size="sm" onClick={addDrug} className="mb-4">
                                    <Plus className="h-4 w-4 mr-2" /> Add Drug
                                </Button>
                            )}
                            <div className="space-y-2">
                                {(data.drugs_administered || []).map((drug, idx) => (
                                    <div key={idx} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Label className="text-xs">Drug Name</Label>
                                            <Input
                                                value={drug.drug_name || ''}
                                                onChange={(e) => updateDrug(idx, 'drug_name', e.target.value)}
                                                disabled={disabled}
                                                placeholder="Drug name"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Label className="text-xs">Dose</Label>
                                            <Input
                                                value={drug.dose || ''}
                                                onChange={(e) => updateDrug(idx, 'dose', e.target.value)}
                                                disabled={disabled}
                                                placeholder="Dose"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Label className="text-xs">Time</Label>
                                            <Input
                                                type="time"
                                                value={drug.time || ''}
                                                onChange={(e) => updateDrug(idx, 'time', e.target.value)}
                                                disabled={disabled}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Label className="text-xs">Route</Label>
                                            <Input
                                                value={drug.route || ''}
                                                onChange={(e) => updateDrug(idx, 'route', e.target.value)}
                                                disabled={disabled}
                                                placeholder="Route"
                                            />
                                        </div>
                                        {!disabled && (
                                            <Button variant="ghost" size="icon" onClick={() => removeDrug(idx)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Specimen */}
                    <AccordionItem value="specimen">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.specimen && <SECTION_ICONS.specimen className="h-5 w-5 text-green-500" />}
                                <span className="font-medium">Specimen</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Checkbox
                                    id="specimen_taken"
                                    checked={data.specimen?.specimen_taken || false}
                                    onCheckedChange={(v) => set('specimen.specimen_taken', v === true)}
                                    disabled={disabled}
                                />
                                <Label htmlFor="specimen_taken">Specimen Taken</Label>
                            </div>
                            {data.specimen?.specimen_taken && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Taken To</Label>
                                        <Input
                                            value={data.specimen?.taken_to || ''}
                                            onChange={(e) => set('specimen.taken_to', e.target.value)}
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Taken By</Label>
                                        <Input
                                            value={data.specimen?.taken_by || ''}
                                            onChange={(e) => set('specimen.taken_by', e.target.value)}
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Recovery Room Handover */}
                    <AccordionItem value="handoff">
                        <AccordionTrigger className="hover:bg-slate-100 px-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {SECTION_ICONS.handoff && <SECTION_ICONS.handoff className="h-5 w-5 text-teal-500" />}
                                <span className="font-medium">Recovery Room Handover *</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Transferred By *</Label>
                                    <Input
                                        value={data.recovery_room_handover?.transferred_by || ''}
                                        onChange={(e) => set('recovery_room_handover.transferred_by', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature</Label>
                                    <Input
                                        value={data.recovery_room_handover?.signature || ''}
                                        onChange={(e) => set('recovery_room_handover.signature', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={data.recovery_room_handover?.time || ''}
                                        onChange={(e) => set('recovery_room_handover.time', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Receiving Nurse *</Label>
                                    <UserSelect
                                        value={data.ward_recipient?.receiving_nurse || ''}
                                        onChange={(value) => set('ward_recipient.receiving_nurse', value)}
                                        role="NURSE"
                                        placeholder="Select receiving nurse..."
                                        excludeCurrentUser={true}
                                        currentUserId={user?.id}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature</Label>
                                    <Input
                                        value={data.ward_recipient?.signature || ''}
                                        onChange={(e) => set('ward_recipient.signature', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={data.ward_recipient?.time || ''}
                                        onChange={(e) => set('ward_recipient.time', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Finalize Button */}
                {!disabled && (
                    <div className="mt-6 flex justify-center">
                        <Button size="lg" onClick={() => setFinalizeDialogOpen(true)}>
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Finalize Record
                        </Button>
                    </div>
                )}
            </main>

            {/* Finalize Dialog */}
            <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalize Immediate Recovery Care Record</DialogTitle>
                        <DialogDescription>
                            This will lock the record. You must complete all required fields before finalizing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-600">
                            Current progress: {progressPercent}% complete ({completedSections}/{totalSections} sections)
                        </p>
                        <Progress value={progressPercent} className="mt-2" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleFinalize} disabled={finalizeMutation.isPending}>
                            {finalizeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Finalize & Sign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="container mx-auto space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
    );
}
