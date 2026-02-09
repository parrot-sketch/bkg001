'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { casePlanApi, CasePlanResponseDto } from '@/lib/api/case-plan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
    Loader2,
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Camera,
    Users,
    Shield,
    Calendar,
    Clock,
    Circle,
    ExternalLink,
    CalendarCheck,
    Send,
} from 'lucide-react';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ProfileImage } from '@/components/profile-image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMarkCaseReady } from '@/hooks/doctor/useSurgicalCases';

// Tabs
import { ClinicalPlanTab } from '@/components/doctor/case-plan/ClinicalPlanTab';
import { ConsentsTab } from '@/components/doctor/case-plan/ConsentsTab';
import { PhotosTab } from '@/components/doctor/case-plan/PhotosTab';
import { TeamTab } from '@/components/doctor/case-plan/TeamTab';

// ─── Safety Checklist Items ───────────────────────────────────────────
interface ChecklistItem {
    key: string;
    label: string;
    shortLabel: string;
    done: boolean;
}

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

// ─── Readiness Badge ──────────────────────────────────────────────────
function ReadinessBadge({ status }: { status?: string }) {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        READY: { label: 'Ready for Surgery', variant: 'default' },
        IN_PROGRESS: { label: 'In Progress', variant: 'secondary' },
        NOT_STARTED: { label: 'Not Started', variant: 'outline' },
        PENDING_LABS: { label: 'Pending Labs', variant: 'secondary' },
        PENDING_CONSENT: { label: 'Pending Consent', variant: 'secondary' },
        PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' },
        ON_HOLD: { label: 'On Hold', variant: 'destructive' },
    };
    const c = config[status || 'NOT_STARTED'] || config.NOT_STARTED;
    return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
}

// ─── Patient Age Helper ───────────────────────────────────────────────
function calculateAge(dob?: string | Date): string | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}y`;
}

// ═════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════
export default function OperativePlanPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
    const [casePlan, setCasePlan] = useState<CasePlanResponseDto | null>(null);
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

    // Derived data
    const checklist = useMemo(() => buildChecklist(casePlan), [casePlan]);
    const completedCount = checklist.filter(c => c.done).length;
    const progressPct = Math.round((completedCount / checklist.length) * 100);

    // ─── Loading ──────────────────────────────────────────────────────
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
    const age = calculateAge(patient?.dateOfBirth);

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-16">

            {/* ── Back Navigation ─────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 -ml-2 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                </Button>
            </div>

            {/* ── Patient Context Bar ────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Patient identity */}
                    <div className="flex items-center gap-4 min-w-0">
                        <ProfileImage name={patientName} className="h-11 w-11 shrink-0 text-sm" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold truncate">{patientName}</h1>
                                <ReadinessBadge status={casePlan?.readinessStatus} />
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                                {patient?.fileNumber && (
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {patient.fileNumber}
                                    </span>
                                )}
                                {patient?.gender && <span>{patient.gender}</span>}
                                {age && <span>{age}</span>}
                                <span className="hidden sm:inline text-border">·</span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {appointment.time}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {patient && (
                            <Link href={`/doctor/patients/${appointment.patientId}`}>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                                    <ExternalLink className="h-3 w-3" />
                                    Patient Profile
                                </Button>
                            </Link>
                        )}

                        {/* Mark Ready for Scheduling — only show when case is in PLANNING status */}
                        {casePlan?.surgicalCase?.status === 'PLANNING' && (
                            <Button
                                size="sm"
                                className="gap-1.5 text-xs h-8"
                                disabled={markReadyMutation.isPending}
                                onClick={() => {
                                    if (casePlan?.surgicalCase?.id) {
                                        markReadyMutation.mutate(casePlan.surgicalCase.id, {
                                            onSuccess: () => {
                                                // Reload data to reflect new status
                                                loadData();
                                            },
                                        });
                                    }
                                }}
                            >
                                {markReadyMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Send className="h-3 w-3" />
                                )}
                                Mark Ready for Scheduling
                            </Button>
                        )}

                        {/* Show status badge when case is already READY or SCHEDULED */}
                        {casePlan?.surgicalCase?.status === 'READY_FOR_SCHEDULING' && (
                            <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-xs gap-1">
                                <CalendarCheck className="h-3 w-3" />
                                Ready for Scheduling
                            </Badge>
                        )}
                        {casePlan?.surgicalCase?.status === 'SCHEDULED' && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs gap-1">
                                <CalendarCheck className="h-3 w-3" />
                                Scheduled
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Allergy Alert */}
                {patient?.allergies && (
                    <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Allergy Alert:</span>
                        <span>{patient.allergies}</span>
                    </div>
                )}

                {/* ── Safety Progress Strip ────────────────────────── */}
                <div className="border-t px-4 sm:px-5 py-3 bg-muted/30">
                    <TooltipProvider delayDuration={100}>
                        <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {completedCount}/{checklist.length}
                            </span>

                            {/* Progress dots */}
                            <div className="flex items-center gap-1.5 flex-1">
                                {checklist.map((item, i) => (
                                    <Tooltip key={item.key}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className={cn(
                                                    "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                                    item.done
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {item.done ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <Circle className="h-3 w-3" />
                                                )}
                                                <span className="hidden md:inline">{item.shortLabel}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{item.label}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            progressPct === 100 ? "bg-emerald-500" : "bg-primary"
                                        )}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {progressPct}%
                                </span>
                            </div>
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            {/* ── Tabbed Workspace (Full Width) ──────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start gap-1 p-1 bg-muted/40 rounded-lg h-auto">
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
    );
}

// ─── Tab Trigger ──────────────────────────────────────────────────────
function NavTab({ value, icon: Icon, label }: {
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground",
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
        </TabsTrigger>
    );
}
