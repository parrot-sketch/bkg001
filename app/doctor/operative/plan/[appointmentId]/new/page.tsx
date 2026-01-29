'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { casePlanApi, CasePlanResponseDto } from '@/lib/api/case-plan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { toast } from 'sonner';
import {
    Loader2,
    ArrowLeft,
    AlertCircle,
    Save,
    CheckCircle2,
    FileText,
    Camera,
    Users,
    Shield,
    Calendar,
    Clock,
    ChevronRight
} from 'lucide-react';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ProfileImage } from '@/components/profile-image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Tabs
import { ClinicalPlanTab } from '@/components/doctor/case-plan/ClinicalPlanTab';
import { ConsentsTab } from '@/components/doctor/case-plan/ConsentsTab';
import { PhotosTab } from '@/components/doctor/case-plan/PhotosTab';
import { TeamTab } from '@/components/doctor/case-plan/TeamTab';

export default function OperativePlanPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
    const [casePlan, setCasePlan] = useState<CasePlanResponseDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('clinical');

    const appointmentId = params.appointmentId as string;

    useEffect(() => {
        if (appointmentId && user) {
            loadData();
        }
    }, [appointmentId, user]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Get Appointment
            const apptResponse = await doctorApi.getAppointment(parseInt(appointmentId));
            if (apptResponse.success && apptResponse.data) {
                setAppointment(apptResponse.data);
            } else {
                toast.error('Failed to load appointment details');
                return;
            }

            // 2. Get Existing CasePlan
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
                ...data
            };

            const response = await casePlanApi.create(dto);

            if (response.success) {
                toast.success('Clinical plan saved successfully');
                if (response.data) {
                    setCasePlan(response.data);
                }
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

    if (loading || !appointment) {
        return (
            <ClinicalDashboardShell>
                <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-medium animate-pulse">Initializing surgical workspace...</p>
                </div>
            </ClinicalDashboardShell>
        );
    }

    const patientName = `${appointment.patient?.firstName} ${appointment.patient?.lastName}`;

    return (
        <ClinicalDashboardShell>
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">

                {/* Navigation Breadcrumb */}
                <nav className="flex items-center text-sm text-muted-foreground">
                    <Link href="/doctor/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                    <ChevronRight className="h-4 w-4 mx-2" />
                    <Link href={`/doctor/cases/${appointmentId}`} className="hover:text-foreground transition-colors">Case #{appointmentId}</Link>
                    <ChevronRight className="h-4 w-4 mx-2" />
                    <span className="font-medium text-foreground">Operative Plan</span>
                </nav>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Operative Planning</h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
                            <span className="text-slate-300">|</span>
                            <Clock className="h-4 w-4" />
                            {appointment.time}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Main Content Area (8 Cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full justify-start p-1 bg-slate-100/50 rounded-xl mb-6 h-auto flex-wrap">
                                <TabTrigger value="clinical" icon={FileText} label="Clinical Plan" />
                                <TabTrigger value="consents" icon={Shield} label="Consents" />
                                <TabTrigger value="photos" icon={Camera} label="Imagery" />
                                <TabTrigger value="team" icon={Users} label="Surgical Team" />
                            </TabsList>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                                <TabsContent value="clinical" className="m-0 p-6 md:p-8">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Clinical Strategy</h3>
                                        <p className="text-sm text-slate-500">Define procedure details, approach, and requirements.</p>
                                    </div>
                                    <ClinicalPlanTab
                                        casePlan={casePlan}
                                        onSave={handleSaveClinical}
                                        saving={saving}
                                    />
                                </TabsContent>

                                <TabsContent value="consents" className="m-0 p-6 md:p-8">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Legal & Consents</h3>
                                        <p className="text-sm text-slate-500">Manage informed consent and liability documentation.</p>
                                    </div>
                                    <ConsentsTab casePlan={casePlan} />
                                </TabsContent>

                                <TabsContent value="photos" className="m-0 p-6 md:p-8">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Medical Imagery</h3>
                                        <p className="text-sm text-slate-500">Pre-operative photos and reference imagery.</p>
                                    </div>
                                    <PhotosTab casePlan={casePlan} />
                                </TabsContent>

                                <TabsContent value="team" className="m-0 p-6 md:p-8">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Team Composition</h3>
                                        <p className="text-sm text-slate-500">Assign surgical staff and roles.</p>
                                    </div>
                                    <TeamTab casePlan={casePlan} />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    {/* Sidebar Area (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Patient Summary */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50/80 p-6 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <ProfileImage name={patientName} className="h-14 w-14 text-lg" />
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{patientName}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {appointment.patient?.fileNumber || 'No File #'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-5 space-y-4 bg-white">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gender</span>
                                        <p className="font-medium text-slate-900">{appointment.patient?.gender}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DOB</span>
                                        <p className="font-medium text-slate-900">
                                            {appointment.patient?.dateOfBirth ? new Date(appointment.patient.dateOfBirth).getFullYear() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {appointment.patient?.allergies && (
                                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex gap-3 text-sm text-rose-800">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                                        <div className="font-medium">
                                            Alert: {appointment.patient.allergies}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Safety Checklist */}
                        <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                                    <Shield className="h-5 w-5 text-indigo-600" />
                                    Safety & Compliance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <CheckItem label="Procedure Verified" checked={!!casePlan?.procedurePlan} />
                                <CheckItem label="Risk Factors Assessed" checked={!!casePlan?.riskFactors} />
                                <CheckItem label="Consents Signed" checked={false} />
                                <CheckItem label="Site Marking" checked={false} />
                            </CardContent>
                            <CardFooter className="pt-2">
                                <p className="text-xs text-indigo-600/70 italic text-center w-full">
                                    * All items must be cleared before admission
                                </p>
                            </CardFooter>
                        </Card>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Link href={`/doctor/cases/${appointmentId}`}>
                                <Button variant="outline" className="w-full bg-white hover:bg-slate-50 text-slate-600 border-slate-200">
                                    Return to Case Overview
                                </Button>
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </ClinicalDashboardShell>
    );
}

function TabTrigger({ value, icon: Icon, label }: any) {
    return (
        <TabsTrigger
            value={value}
            className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
        >
            <Icon className="h-4 w-4" />
            <span className="font-semibold">{label}</span>
        </TabsTrigger>
    )
}

function CheckItem({ label, checked }: any) {
    return (
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition-colors">
            <span className={cn("text-sm font-medium", checked ? "text-slate-700" : "text-slate-400")}>{label}</span>
            {checked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
                <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
            )}
        </div>
    )
}
