'use client';

/**
 * Operative Plan Page - REFACTORED
 * 
 * Surgical planning workspace for doctors.
 * Modularized into separate components for better maintainability.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { casePlanApi, CasePlanResponseDto } from '@/lib/api/case-plan';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Loader2,
    AlertTriangle,
    FileText,
    Camera,
    Users,
    Shield,
} from 'lucide-react';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { cn } from '@/lib/utils';
import { useMarkCaseReady } from '@/hooks/doctor/useSurgicalCases';

// Refactored Components
import { OperativePlanHeader } from '../../components/OperativePlanHeader';
import { SafetyProgressStrip, ChecklistItem } from '../../components/SafetyProgressStrip';
import { PatientSidebar } from '../../components/PatientSidebar';

// Tabs
import { ClinicalPlanTab } from '@/components/doctor/case-plan/ClinicalPlanTab';
import { ConsentsTab } from '@/components/doctor/case-plan/ConsentsTab';
import { PhotosTab } from '@/components/doctor/case-plan/PhotosTab';
import { TeamTab } from '@/components/doctor/case-plan/TeamTab';

// ─── Safety Checklist Helper ──────────────────────────────────────────
function buildChecklist(casePlan: CasePlanResponseDto | null): ChecklistItem[] {
    const hasSignedConsents = casePlan?.consents?.some(c => c.status === 'SIGNED') ?? false;
    const hasPreOpImages = (casePlan?.images?.length ?? 0) > 0;

    return [
        { key: 'procedure', label: 'Procedure Verified', shortLabel: 'Procedure', done: !!casePlan?.procedurePlan },
        { key: 'risk', label: 'Risk Factors Assessed', shortLabel: 'Risk', done: !!casePlan?.riskFactors },
        { key: 'anesthesia', label: 'Anesthesia Planned', shortLabel: 'Anesthesia', done: !!casePlan?.anesthesiaPlan },
        { key: 'consents', label: 'Consents Signed', shortLabel: 'Consents', done: hasSignedConsents },
        { key: 'imagery', label: 'Pre-Op Imagery', shortLabel: 'Photos', done: hasPreOpImages },
    ];
}

export default function OperativePlanPage() {
    const params = useParams();
    const { user } = useAuth();

    const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
    const [casePlan, setCasePlan] = useState<CasePlanResponseDto | null>(null);
    const [patientDetails, setPatientDetails] = useState<PatientResponseDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('clinical');
    const markReadyMutation = useMarkCaseReady();

    const appointmentId = params.appointmentId as string;

    useEffect(() => {
        if (appointmentId && user) {
            loadData();
        }
    }, [appointmentId, user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const apptResponse = await doctorApi.getAppointment(parseInt(appointmentId));
            if (apptResponse.success && apptResponse.data) {
                setAppointment(apptResponse.data);
                
                if (apptResponse.data.patientId) {
                    const patientResponse = await doctorApi.getPatient(apptResponse.data.patientId);
                    if (patientResponse.success && patientResponse.data) {
                        setPatientDetails(patientResponse.data);
                    }
                }
            } else {
                toast.error('Failed to load appointment details');
                return;
            }
            const planResponse = await casePlanApi.getByAppointmentId(parseInt(appointmentId));
            if (planResponse.success && planResponse.data) {
                setCasePlan(planResponse.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading case data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClinical = async (data: any) => {
        if (!appointment || !user) return;
        try {
            setSaving(true);
            const dto: CreateCasePlanDto = {
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                doctorId: user.id,
                ...data,
            };
            const response = await casePlanApi.create(dto);
            if (response.success) {
                toast.success('Clinical plan saved');
                if (response.data) setCasePlan(response.data);
            } else {
                toast.error(response.error || 'Failed to save plan');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleMarkReady = (id: string) => {
        markReadyMutation.mutate(id, {
            onSuccess: () => {
                loadData();
            },
        });
    };

    const checklist = useMemo(() => buildChecklist(casePlan), [casePlan]);

    if (loading || !appointment) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                    Initializing surgical workspace…
                </p>
            </div>
        );
    }

    const patient = appointment.patient;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-16">
            
            <OperativePlanHeader 
                patientName={patientName}
                patientId={appointment.patientId}
                fileNumber={patientDetails?.fileNumber || patient?.fileNumber}
                gender={patientDetails?.gender || patient?.gender}
                dateOfBirth={patientDetails?.dateOfBirth || patient?.dateOfBirth}
                appointmentDate={appointment.appointmentDate}
                appointmentTime={appointment.time}
                readinessStatus={casePlan?.readinessStatus}
                surgicalCaseStatus={casePlan?.surgicalCase?.status}
                surgicalCaseId={casePlan?.surgicalCase?.id?.toString()}
                isPendingMarkReady={markReadyMutation.isPending}
                onMarkReady={handleMarkReady}
            />

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {/* Allergy Alert */}
                {(patientDetails?.allergies || (patient as any)?.allergies) && (
                    <div className="mx-4 sm:mx-5 mt-4 sm:mt-5 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Allergy Alert:</span>
                        <span>{patientDetails?.allergies || (patient as any)?.allergies}</span>
                    </div>
                )}

                <SafetyProgressStrip checklist={checklist} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                    <PatientSidebar 
                        patient={patientDetails || appointment?.patient} 
                        patientId={appointment.patientId}
                    />
                </div>

                <div className="lg:col-span-8 xl:col-span-9">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full justify-start gap-1 p-1 bg-muted/40 rounded-lg h-auto border">
                            <NavTab value="clinical" icon={FileText} label="Clinical Plan" />
                            <NavTab value="consents" icon={Shield} label="Consents" />
                            <NavTab value="photos" icon={Camera} label="Imagery" />
                            <NavTab value="team" icon={Users} label="Team" />
                        </TabsList>

                        <div className="mt-4 rounded-xl border bg-card shadow-sm overflow-hidden">
                            <TabsContent value="clinical" className="m-0 p-5 sm:p-6 lg:p-8">
                                <ClinicalPlanTab
                                    casePlan={casePlan}
                                    onSave={handleSaveClinical}
                                    saving={saving}
                                />
                            </TabsContent>

                            <TabsContent value="consents" className="m-0 p-5 sm:p-6 lg:p-8">
                                <ConsentsTab casePlan={casePlan} />
                            </TabsContent>

                            <TabsContent value="photos" className="m-0 p-5 sm:p-6 lg:p-8">
                                <PhotosTab casePlan={casePlan} />
                            </TabsContent>

                            <TabsContent value="team" className="m-0 p-5 sm:p-6 lg:p-8">
                                <TeamTab casePlan={casePlan} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// ─── Tab Trigger Helper ──────────────────────────────────────────────
function NavTab({ value, icon: Icon, label }: {
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all hover:bg-background/50",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground",
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
        </TabsTrigger>
    );
}
