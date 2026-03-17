/**
 * Doctor Intra-Operative Record Page
 * 
 * Route: /doctor/surgical-cases/[caseId]/intra-op
 * 
 * Clean professional UI with:
 * - Patient header auto-populated
 * - Tabbed sections for easy navigation
 * - Auto-save functionality
 * - Signature confirmation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ArrowLeft, 
    Save, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Printer,
    User,
    Calendar,
    Users,
    ClipboardList,
    FileText,
    ShieldCheck,
    Activity,
    Send
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface SurgicalCase {
    id: string;
    status: string;
    diagnosis: string;
    procedure_name: string;
    side: string;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        file_number: string;
        allergies: string;
    };
    primary_surgeon: {
        id: string;
        name: string;
    };
}

interface DoctorIntraOpData {
    date: string;
    surgicalTeam: {
        surgeon: string;
        anesthesiologist: string;
        assistant: string;
        scrubNurse: string;
        circulatingNurse: string;
    };
    preOpPrep: {
        shaving: boolean;
        shavingExtent: string;
        skinPrep: boolean;
    };
    diagnosis: {
        preOperative: string;
        operative: string;
    };
    procedure: {
        planned: string;
        performed: string;
    };
    procedureNotes: string;
    additionalNotes: string;
    safetyChecklist: {
        swabCountCorrect: boolean;
        swabCountNotes: string;
    };
    postOpInstructions: string;
    signatures: {
        surgeon: { name: string; timestamp: string } | null;
    };
}

const initialData: DoctorIntraOpData = {
    date: new Date().toISOString().split('T')[0],
    surgicalTeam: {
        surgeon: '',
        anesthesiologist: '',
        assistant: '',
        scrubNurse: '',
        circulatingNurse: '',
    },
    preOpPrep: {
        shaving: false,
        shavingExtent: '',
        skinPrep: false,
    },
    diagnosis: {
        preOperative: '',
        operative: '',
    },
    procedure: {
        planned: '',
        performed: '',
    },
    procedureNotes: '',
    additionalNotes: '',
    safetyChecklist: {
        swabCountCorrect: true,
        swabCountNotes: '',
    },
    postOpInstructions: '',
    signatures: {
        surgeon: null,
    },
};

export default function DoctorIntraOpPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const caseId = params?.caseId as string;

    const [loading, setLoading] = useState(true);
    const [surgicalCase, setSurgicalCase] = useState<SurgicalCase | null>(null);
    const [formData, setFormData] = useState<DoctorIntraOpData>(initialData);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSignDialog, setShowSignDialog] = useState(false);
    const [signingName, setSigningName] = useState('');
    const [isFinalized, setIsFinalized] = useState(false);

    // Load case data
    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch(`/api/doctor/surgical-cases/${caseId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    setSurgicalCase(json.data);
                    
                    // Pre-populate from case
                    const surgeonName = json.data.primary_surgeon 
                        ? `${json.data.primary_surgeon.first_name || ''} ${json.data.primary_surgeon.last_name || ''}`.trim()
                        : '';
                    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
                    
                    const newFormData: DoctorIntraOpData = {
                        ...initialData,
                        date: new Date().toISOString().split('T')[0],
                        surgicalTeam: {
                            ...initialData.surgicalTeam,
                            surgeon: surgeonName || userName || '',
                        },
                        diagnosis: {
                            preOperative: json.data.diagnosis || '',
                            operative: '',
                        },
                        procedure: {
                            planned: json.data.procedure_name || '',
                            performed: json.data.procedure_name || '',
                        },
                    };
                    setFormData(newFormData);
                }
            } catch (err) {
                console.error('Failed to load case:', err);
            } finally {
                setLoading(false);
            }
        }
        if (caseId && isAuthenticated) {
            loadData();
        }
    }, [caseId, isAuthenticated, user]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!isDirty || isFinalized) return;
        const timer = setTimeout(() => {
            handleSave();
        }, 30000);
        return () => clearTimeout(timer);
    }, [isDirty, isFinalized]);

    const handleSave = async () => {
        if (!caseId || saving) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/forms/intra-op`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (json.success) {
                setIsDirty(false);
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSign = () => {
        if (!signingName.trim()) return;
        setFormData(prev => ({
            ...prev,
            signatures: {
                surgeon: {
                    name: signingName,
                    timestamp: new Date().toISOString(),
                }
            }
        }));
        setIsFinalized(true);
        setShowSignDialog(false);
        setSigningName('');
    };

    const updateField = (path: string, value: any) => {
        setFormData(prev => {
            const keys = path.split('.');
            const result = { ...prev };
            let current: any = result;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return result;
        });
        setIsDirty(true);
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }

    if (!surgicalCase) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p>Case not found</p>
                <Button asChild className="mt-4">
                    <Link href="/doctor/surgical-cases">Back to Cases</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" asChild>
                    <Link href={`/doctor/surgical-cases/${caseId}/plan`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Case
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    {isFinalized && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Signed & Finalized
                        </Badge>
                    )}
                    {isDirty && !isFinalized && (
                        <span className="text-sm text-amber-600">Unsaved changes</span>
                    )}
                </div>
            </div>

            {/* Patient Header Card */}
            <Card className="mb-6 border-slate-300">
                <CardContent className="p-6">
                    <div className="grid grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs uppercase text-slate-500 tracking-wider">Patient File No.</p>
                            <p className="text-lg font-semibold">{surgicalCase.patient?.file_number || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-slate-500 tracking-wider">Patient Name</p>
                            <p className="text-lg font-semibold">{surgicalCase.patient?.first_name} {surgicalCase.patient?.last_name}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-slate-500 tracking-wider">Procedure</p>
                            <p className="font-medium">{surgicalCase.procedure_name || 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-slate-500 tracking-wider">Case Status</p>
                            <Badge variant="outline">{surgicalCase.status}</Badge>
                        </div>
                    </div>
                    {surgicalCase.patient?.allergies && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                                <strong>Allergies:</strong> {surgicalCase.patient.allergies}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Form */}
            <Tabs defaultValue="patient" className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="patient">Patient Info</TabsTrigger>
                    <TabsTrigger value="team">Surgical Team</TabsTrigger>
                    <TabsTrigger value="procedure">Procedure</TabsTrigger>
                    <TabsTrigger value="postop">Post-Op & Sign</TabsTrigger>
                </TabsList>

                {/* Tab 1: Patient Info */}
                <TabsContent value="patient">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Patient Information & Pre-Op Prep
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="py-2 pr-4 w-48">
                                            <Label className="text-sm text-slate-600">Date</Label>
                                        </td>
                                        <td className="py-2">
                                            <Input 
                                                type="date" 
                                                value={formData.date}
                                                onChange={(e) => updateField('date', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-xs"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pr-4">
                                            <Label className="text-sm text-slate-600">Surgeon</Label>
                                        </td>
                                        <td className="py-2">
                                            <Input 
                                                value={formData.surgicalTeam.surgeon}
                                                onChange={(e) => updateField('surgicalTeam.surgeon', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                                placeholder="Dr. Name"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <Separator />

                            <div>
                                <Label className="text-sm font-semibold mb-3 block">Pre-Op Preparation</Label>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="py-2 pr-4 w-48">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox 
                                                        checked={formData.preOpPrep.shaving}
                                                        onCheckedChange={(v) => updateField('preOpPrep.shaving', v)}
                                                        disabled={isFinalized}
                                                    />
                                                    <Label>Shaving Performed</Label>
                                                </div>
                                            </td>
                                            <td className="py-2">
                                                {formData.preOpPrep.shaving && (
                                                    <Input 
                                                        value={formData.preOpPrep.shavingExtent}
                                                        onChange={(e) => updateField('preOpPrep.shavingExtent', e.target.value)}
                                                        disabled={isFinalized}
                                                        placeholder="Extent/area"
                                                        className="max-w-md"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox 
                                                        checked={formData.preOpPrep.skinPrep}
                                                        onCheckedChange={(v) => updateField('preOpPrep.skinPrep', v)}
                                                        disabled={isFinalized}
                                                    />
                                                    <Label>Skin Preparation Done</Label>
                                                </div>
                                            </td>
                                            <td className="py-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Surgical Team */}
                <TabsContent value="team">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Surgical Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="py-3 pr-4 w-48"><Label className="text-sm text-slate-600">Surgeon</Label></td>
                                        <td className="py-3">
                                            <Input 
                                                value={formData.surgicalTeam.surgeon}
                                                onChange={(e) => updateField('surgicalTeam.surgeon', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4"><Label className="text-sm text-slate-600">Anaesthesiologist</Label></td>
                                        <td className="py-3">
                                            <Input 
                                                value={formData.surgicalTeam.anesthesiologist}
                                                onChange={(e) => updateField('surgicalTeam.anesthesiologist', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4"><Label className="text-sm text-slate-600">Assistant(s)</Label></td>
                                        <td className="py-3">
                                            <Input 
                                                value={formData.surgicalTeam.assistant}
                                                onChange={(e) => updateField('surgicalTeam.assistant', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                                placeholder="Names of assistants"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4"><Label className="text-sm text-slate-600">Scrub Nurse</Label></td>
                                        <td className="py-3">
                                            <Input 
                                                value={formData.surgicalTeam.scrubNurse}
                                                onChange={(e) => updateField('surgicalTeam.scrubNurse', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4"><Label className="text-sm text-slate-600">Circulating Nurse</Label></td>
                                        <td className="py-3">
                                            <Input 
                                                value={formData.surgicalTeam.circulatingNurse}
                                                onChange={(e) => updateField('surgicalTeam.circulatingNurse', e.target.value)}
                                                disabled={isFinalized}
                                                className="max-w-md"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Procedure */}
                <TabsContent value="procedure">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Diagnosis & Procedure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Diagnosis</Label>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="py-2 pr-4 w-48"><Label className="text-sm text-slate-600">Pre-Operative</Label></td>
                                            <td className="py-2">
                                                <Textarea 
                                                    value={formData.diagnosis.preOperative}
                                                    onChange={(e) => updateField('diagnosis.preOperative', e.target.value)}
                                                    disabled={isFinalized}
                                                    placeholder="Pre-operative diagnosis"
                                                    className="max-w-2xl"
                                                    rows={2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4"><Label className="text-sm text-slate-600">Operative</Label></td>
                                            <td className="py-2">
                                                <Textarea 
                                                    value={formData.diagnosis.operative}
                                                    onChange={(e) => updateField('diagnosis.operative', e.target.value)}
                                                    disabled={isFinalized}
                                                    placeholder="Intra-operative findings/diagnosis"
                                                    className="max-w-2xl"
                                                    rows={2}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Procedure</Label>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="py-2 pr-4 w-48"><Label className="text-sm text-slate-600">Planned</Label></td>
                                            <td className="py-2">
                                                <Textarea 
                                                    value={formData.procedure.planned}
                                                    onChange={(e) => updateField('procedure.planned', e.target.value)}
                                                    disabled={isFinalized}
                                                    className="max-w-2xl"
                                                    rows={2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4"><Label className="text-sm text-slate-600">Performed</Label></td>
                                            <td className="py-2">
                                                <Textarea 
                                                    value={formData.procedure.performed}
                                                    onChange={(e) => updateField('procedure.performed', e.target.value)}
                                                    disabled={isFinalized}
                                                    placeholder="Actual procedures performed"
                                                    className="max-w-2xl"
                                                    rows={3}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Procedure Notes</Label>
                                <Textarea 
                                    value={formData.procedureNotes}
                                    onChange={(e) => updateField('procedureNotes', e.target.value)}
                                    disabled={isFinalized}
                                    placeholder="Detailed operative notes, findings, technique used..."
                                    className="min-h-[200px]"
                                />
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Additional Notes (Page 2)</Label>
                                <Textarea 
                                    value={formData.additionalNotes}
                                    onChange={(e) => updateField('additionalNotes', e.target.value)}
                                    disabled={isFinalized}
                                    placeholder="Continuation of operative notes..."
                                    className="min-h-[150px]"
                                />
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm font-semibold mb-3 block">Safety Checklist</Label>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="py-2 pr-4 w-48">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox 
                                                        checked={formData.safetyChecklist.swabCountCorrect}
                                                        onCheckedChange={(v) => updateField('safetyChecklist.swabCountCorrect', v)}
                                                        disabled={isFinalized}
                                                    />
                                                    <Label>Swab & Instrument Count Correct</Label>
                                                </div>
                                            </td>
                                            <td className="py-2">
                                                {!formData.safetyChecklist.swabCountCorrect && (
                                                    <Input 
                                                        value={formData.safetyChecklist.swabCountNotes}
                                                        onChange={(e) => updateField('safetyChecklist.swabCountNotes', e.target.value)}
                                                        disabled={isFinalized}
                                                        placeholder="Explain discrepancy"
                                                        className="max-w-md"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: Post-Op & Sign */}
                <TabsContent value="postop">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Post-Operative Instructions & Sign
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Post-Operative Instructions</Label>
                                <Textarea 
                                    value={formData.postOpInstructions}
                                    onChange={(e) => updateField('postOpInstructions', e.target.value)}
                                    disabled={isFinalized}
                                    placeholder="Pain management, wound care, activity restrictions, follow-up, medications, warning signs, diet/lifestyle..."
                                    className="min-h-[250px]"
                                />
                            </div>

                            <Separator />

                            {/* Signature Section */}
                            <div className="bg-slate-50 p-6 rounded-lg border">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold">Signature</h3>
                                        <p className="text-sm text-slate-500">Sign to finalize this operative record</p>
                                    </div>
                                    {formData.signatures.surgeon ? (
                                        <Badge className="bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Signed by {formData.signatures.surgeon.name}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Not signed</Badge>
                                    )}
                                </div>

                                {isFinalized ? (
                                    <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg text-center">
                                        <p className="text-lg font-script text-slate-600">{formData.signatures.surgeon?.name}</p>
                                        <p className="text-sm text-slate-400">
                                            Signed on {formData.signatures.surgeon?.timestamp && format(new Date(formData.signatures.surgeon.timestamp), 'PPP p')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Input 
                                            value={signingName}
                                            onChange={(e) => setSigningName(e.target.value)}
                                            placeholder="Type full name to sign"
                                            className="max-w-md"
                                        />
                                        <Button 
                                            onClick={handleSign}
                                            disabled={!signingName.trim()}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            Sign & Finalize
                                        </Button>
                                        <p className="text-xs text-slate-500">
                                            By signing, you confirm that all information is accurate and complete.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : isDirty ? (
                            'Unsaved changes'
                        ) : (
                            'All changes saved'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleSave}
                            disabled={saving || !isDirty || isFinalized}
                        >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                        {isFinalized && (
                            <Button variant="outline">
                                <Printer className="h-4 w-4 mr-2" />
                                Print Record
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
