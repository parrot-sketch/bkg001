/**
 * Doctor Intra-Operative Record Page
 * 
 * Route: /doctor/surgical-cases/[caseId]/intra-op
 * 
 * Clean, modular UI with:
 * - Patient header auto-populated
 * - Tabbed sections for easy navigation
 * - Rich text editors for clinical documentation
 * - Auto-save functionality
 * - Signature confirmation
 * - Workflow transitions
 */

'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ArrowLeft, 
    Save, 
    Loader2, 
    AlertCircle,
    Calendar,
} from 'lucide-react';
import Link from 'next/link';

import { useDoctorIntraOp } from './hooks/useDoctorIntraOp';
import {
    PatientHeader,
    SurgicalTeamSection,
    DiagnosisSection,
    ProcedureSection,
    SafetyChecklistSection,
    PostOpAndSignatureSection,
} from './components';

export default function DoctorIntraOpPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const caseId = params?.caseId as string;

    const {
        loading,
        error,
        surgicalCase,
        formData,
        isDirty,
        isSaving,
        isFinalized,
        updateField,
        save,
        finalize,
        canTransition,
        transitionTo,
    } = useDoctorIntraOp({
        caseId,
        user,
    });

    const [activeTab, setActiveTab] = useState('patient');
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleFinalize = useCallback(async (signature: string) => {
        setIsFinalizing(true);
        await finalize(signature);
        setIsFinalizing(false);
    }, [finalize]);

    const handleTransitionToRecovery = useCallback(async () => {
        setIsTransitioning(true);
        const success = await transitionTo('RECOVERY');
        setIsTransitioning(false);
        if (success) {
            router.push('/doctor/surgical-cases');
        }
    }, [transitionTo, router]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }

    if (error || !surgicalCase) {
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
        <div className="max-w-5xl mx-auto p-6 space-y-6 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/doctor/surgical-cases">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-stone-900">Operative Record</h1>
                        <div className="flex items-center gap-2 text-sm text-stone-500 mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formData.date || new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {isDirty && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            Unsaved changes
                        </span>
                    )}
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={save}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Draft
                    </Button>
                </div>
            </div>

            {/* Patient Header */}
            <PatientHeader surgicalCase={surgicalCase} />

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start gap-1 bg-stone-100 p-1 rounded-lg">
                    <TabsTrigger value="patient" className="data-[state=active]:bg-white">
                        Patient Info
                    </TabsTrigger>
                    <TabsTrigger value="team" className="data-[state=active]:bg-white">
                        Team
                    </TabsTrigger>
                    <TabsTrigger value="diagnosis" className="data-[state=active]:bg-white">
                        Diagnosis
                    </TabsTrigger>
                    <TabsTrigger value="procedure" className="data-[state=active]:bg-white">
                        Procedure
                    </TabsTrigger>
                    <TabsTrigger value="safety" className="data-[state=active]:bg-white">
                        Safety
                    </TabsTrigger>
                    <TabsTrigger value="postop" className="data-[state=active]:bg-white">
                        Post-Op & Sign
                    </TabsTrigger>
                </TabsList>

                <Card className="mt-4 border-stone-200 shadow-sm">
                    <CardContent className="pt-6 space-y-6">
                        <TabsContent value="patient">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-stone-500">Date of Surgery</Label>
                                        <Input 
                                            value={formData.date}
                                            onChange={(e) => updateField('date', e.target.value)}
                                            disabled={isFinalized}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-stone-500">Patient</Label>
                                        <p className="mt-1 text-sm font-medium text-stone-700">
                                            {surgicalCase.patient?.first_name} {surgicalCase.patient?.last_name}
                                        </p>
                                        {surgicalCase.patient?.file_number && (
                                            <p className="text-xs text-stone-400">File #: {surgicalCase.patient.file_number}</p>
                                        )}
                                    </div>
                                </div>
                                {surgicalCase.patient?.allergies && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <Label className="text-sm text-red-600 font-medium">Allergies</Label>
                                        <p className="text-sm text-red-700">{surgicalCase.patient.allergies}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <Label className="text-sm text-stone-500">Procedure</Label>
                                        <p className="mt-1 text-sm font-medium text-stone-700">{surgicalCase.procedure_name || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-stone-500">Diagnosis</Label>
                                        <p className="mt-1 text-sm font-medium text-stone-700">{surgicalCase.diagnosis || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="team">
                            <SurgicalTeamSection 
                                surgicalTeam={formData.surgicalTeam}
                                updateField={updateField}
                                readOnly={true}
                            />
                            <p className="text-xs text-stone-400 mt-4">
                                Team members are managed by the Theater Technician and cannot be modified here.
                            </p>
                        </TabsContent>

                        <TabsContent value="diagnosis">
                            <DiagnosisSection 
                                diagnosis={formData.diagnosis}
                                updateField={updateField}
                                readOnly={isFinalized}
                            />
                        </TabsContent>

                        <TabsContent value="procedure">
                            <ProcedureSection 
                                procedure={formData.procedure}
                                procedureNotes={formData.procedureNotes}
                                additionalNotes={formData.additionalNotes}
                                updateField={updateField}
                                readOnly={isFinalized}
                            />
                        </TabsContent>

                        <TabsContent value="safety">
                            <SafetyChecklistSection 
                                checklist={formData.safetyChecklist}
                                updateField={updateField}
                                readOnly={isFinalized}
                            />
                        </TabsContent>

                        <TabsContent value="postop">
                            <PostOpAndSignatureSection 
                                postOpInstructions={formData.postOpInstructions}
                                signatures={formData.signatures}
                                updateField={updateField}
                                readOnly={isFinalized}
                                isFinalizing={isFinalizing}
                                onFinalize={handleFinalize}
                                canTransition={canTransition('RECOVERY')}
                                onTransitionToRecovery={handleTransitionToRecovery}
                                isTransitioning={isTransitioning}
                            />
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
