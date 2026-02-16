'use client';

/**
 * Case-Centric Surgical Plan Page
 *
 * Route: /doctor/surgical-cases/[caseId]/plan
 *
 * Displays the full surgical planning workspace keyed by surgical case ID.
 * Four tabs: Clinical Plan, Consents, Photos, Team.
 * Readiness checklist driven by backend truth.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCasePlanDetail, useUpdateCasePlan } from '@/hooks/doctor/useCasePlan';
import { useMarkCaseReady, MarkReadyError } from '@/hooks/doctor/useSurgicalCases';
import { CasePlanDetailDto } from '@/lib/api/case-plan';
import { ReadinessItem } from '@/lib/api/surgical-cases';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
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
    Loader2,
    AlertCircle,
    XCircle,
    Printer,
    Timer,
    Edit,
} from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
    TIMELINE_FIELD_ORDER,
    TIMELINE_FIELD_LABELS,
    type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';

// Tabs — imported from existing components
import { ClinicalPlanTab } from '@/components/doctor/case-plan/ClinicalPlanTab';
import { ConsentsTab } from '@/components/doctor/case-plan/ConsentsTab';
import { PhotosTab } from '@/components/doctor/case-plan/PhotosTab';
import { TeamTab } from '@/components/doctor/case-plan/TeamTab';

// ─── Helpers ────────────────────────────────────────────────────────────

function calculateAge(dob?: string | Date | null): string | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}y`;
}

const READINESS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    READY: { label: 'Ready for Surgery', variant: 'default' },
    IN_PROGRESS: { label: 'In Progress', variant: 'secondary' },
    NOT_STARTED: { label: 'Not Started', variant: 'outline' },
    PENDING_LABS: { label: 'Pending Labs', variant: 'secondary' },
    PENDING_CONSENT: { label: 'Pending Consent', variant: 'secondary' },
    PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' },
    ON_HOLD: { label: 'On Hold', variant: 'destructive' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    PLANNING: { label: 'Planning', className: 'bg-blue-100 text-blue-700' },
    READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'bg-cyan-100 text-cyan-700' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-700' },
};

/** Statuses where an operative timeline exists and should be shown. */
const OPERATIVE_STATUSES = new Set([
    'IN_PREP',
    'IN_THEATER',
    'RECOVERY',
    'COMPLETED',
]);

function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

/**
 * Adapt CasePlanDetailDto into the shape expected by existing ClinicalPlanTab,
 * ConsentsTab, PhotosTab, TeamTab (which expect CasePlanResponseDto).
 */
function adaptForLegacyTabs(detail: CasePlanDetailDto) {
    if (!detail.casePlan) return null;
    const cp = detail.casePlan;
    return {
        id: cp.id,
        appointmentId: cp.appointmentId,
        patientId: detail.patient?.id ?? '',
        doctorId: detail.primarySurgeon?.id ?? '',
        surgicalCaseId: detail.id,
        procedurePlan: cp.procedurePlan,
        riskFactors: cp.riskFactors,
        preOpNotes: cp.preOpNotes,
        implantDetails: cp.implantDetails,
        anesthesiaPlan: cp.anesthesiaPlan,
        specialInstructions: cp.specialInstructions,
        estimatedDurationMinutes: cp.estimatedDurationMinutes ?? null,
        readinessStatus: cp.readinessStatus,
        readyForSurgery: cp.readyForSurgery,
        createdAt: detail.createdAt,
        updatedAt: cp.updatedAt,
        surgicalCase: {
            id: detail.id,
            status: detail.status,
            urgency: detail.urgency,
            staffInvites: detail.staffInvites,
        },
        consents: cp.consents,
        images: cp.images,
        procedure_record: cp.procedureRecord
            ? {
                urgency: cp.procedureRecord.urgency,
                anesthesia_type: cp.procedureRecord.anesthesiaType ?? '',
                staff: cp.procedureRecord.staff.map((s) => ({
                    role: s.role,
                    user: s.user
                        ? { firstName: s.user.firstName, lastName: s.user.lastName, role: s.user.role }
                        : { firstName: '?', lastName: '?', role: 'UNKNOWN' },
                })),
            }
            : undefined,
    };
}

// ═══════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════

export default function CasePlanPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: detail, isLoading, error, refetch } = useCasePlanDetail(caseId);
    const updatePlan = useUpdateCasePlan(caseId);
    const markReady = useMarkCaseReady();

    const [activeTab, setActiveTab] = useState('clinical');
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingItems, setMissingItems] = useState<ReadinessItem[]>([]);

    // ─── Mark Ready handler with modal on failure ────────────────────
    const handleMarkReady = useCallback(() => {
        markReady.mutate(caseId, {
            onSuccess: () => {
                refetch();
                toast.success('Case marked as ready for scheduling', {
                    description: 'The case is now available for theater booking.',
                });
            },
            onError: (error: MarkReadyError) => {
                if (error.missingItems && error.missingItems.length > 0) {
                    setMissingItems(error.missingItems);
                    setShowMissingModal(true);
                } else {
                    toast.error('Cannot mark as ready', { description: error.message });
                }
            },
        });
    }, [caseId, markReady, refetch]);

    // Map checklist keys to tabs for quick navigation
    const keyToTab: Record<string, string> = {
        procedure: 'clinical',
        risk: 'clinical',
        anesthesia: 'clinical',
        consents: 'consents',
        photos: 'photos',
        nurse_checklist: '', // No tab — external
    };

    // ─── Edit Details Handler ────────────────────────────────────────
    const [showEditDetails, setShowEditDetails] = useState(false);
    const [editDetailsForm, setEditDetailsForm] = useState({
        procedureName: '',
        side: '',
        diagnosis: '',
    });

    // Initialize form when detail loads or modal opens
    useEffect(() => {
        if (detail && showEditDetails) {
            setEditDetailsForm({
                procedureName: detail.procedureName ?? '',
                side: detail.side ?? '',
                diagnosis: detail.diagnosis ?? '',
            });
        }
    }, [detail, showEditDetails]);

    const handleSaveDetails = async () => {
        await updatePlan.mutateAsync({
            // Only sending the fields we are editing here
            procedureName: editDetailsForm.procedureName,
            side: editDetailsForm.side,
            diagnosis: editDetailsForm.diagnosis,
        } as any); // Casting because updatePlan expects partial CasePlan but we updated api to handle these
        setShowEditDetails(false);
        toast.success('Case details updated');
        refetch(); // Ensure UI updates immediately
    };

    // ─── Save handler for ClinicalPlanTab ────────────────────────────
    const handleSaveClinical = useCallback(
        async (data: any) => {
            await updatePlan.mutateAsync({
                procedureName: data.procedureName,
                procedurePlan: data.procedurePlan,
                riskFactors: data.riskFactors,
                preOpNotes: data.preOpNotes,
                implantDetails: data.implantDetails,
                anesthesiaPlan: data.anesthesiaPlan,
                specialInstructions: data.specialInstructions,
                estimatedDurationMinutes: data.estimatedDurationMinutes,
                readinessStatus: data.readinessStatus,
            } as any);
        },
        [updatePlan],
    );

    // ─── Readiness checklist from API truth ──────────────────────────
    const checklist = detail?.readinessChecklist ?? [];
    const completedCount = checklist.filter((c) => c.done).length;
    const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

    // Adapt for legacy tabs
    const legacyPlan = useMemo(() => (detail ? adaptForLegacyTabs(detail) : null), [detail]);

    // ─── Loading ─────────────────────────────────────────────────────
    if (isLoading) {
        return <PlanPageSkeleton />;
    }

    // ─── Error ───────────────────────────────────────────────────────
    if (error || !detail) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                    {error?.message || 'Case not found'}
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/doctor/surgical-cases')}>
                    Back to Cases
                </Button>
            </div>
        );
    }

    const patient = detail.patient;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
    const age = calculateAge(patient?.dateOfBirth);
    const readinessConfig = READINESS_CONFIG[detail.casePlan?.readinessStatus ?? 'NOT_STARTED'] ?? READINESS_CONFIG.NOT_STARTED;
    const statusConfig = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.DRAFT;

    return (
        <TooltipProvider delayDuration={100}>
            <div className="space-y-5 animate-in fade-in duration-500 pb-16">

                {/* ── Back Navigation ──────────────────────────────── */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 -ml-2 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/doctor/surgical-cases')}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        All Cases
                    </Button>
                </div>

                {/* ── Patient Context Bar ─────────────────────────── */}
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        {/* Left: Patient identity */}
                        <div className="flex items-center gap-4 min-w-0">
                            <ProfileImage name={patientName} className="h-11 w-11 shrink-0 text-sm" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg font-bold truncate">{patientName}</h1>
                                    <Badge variant={readinessConfig.variant} className="text-xs">
                                        {readinessConfig.label}
                                    </Badge>
                                    <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                                        {statusConfig.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                                    {patient?.fileNumber && (
                                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {patient.fileNumber}
                                        </span>
                                    )}
                                    {patient?.gender && <span>{patient.gender}</span>}
                                    {age && <span>{age}</span>}
                                    {detail.procedureName && (
                                        <>
                                            <span className="text-border">·</span>
                                            <span className="font-medium text-foreground">{detail.procedureName}</span>
                                        </>
                                    )}
                                    {detail.side && (
                                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {detail.side}
                                        </span>
                                    )}
                                    {detail.casePlan?.estimatedDurationMinutes && (
                                        <>
                                            <span className="text-border">·</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {detail.casePlan.estimatedDurationMinutes} min
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {patient && (
                                <Link href={`/doctor/patients/${patient.id}`}>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                                        <ExternalLink className="h-3 w-3" />
                                        Patient Profile
                                    </Button>
                                </Link>
                            )}

                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowEditDetails(true)}>
                                <Edit className="h-3 w-3" />
                                Edit Details
                            </Button>

                            <Link href={`/doctor/surgical-cases/${caseId}/plan/print`}>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                                    <Printer className="h-3 w-3" />
                                    Print Summary
                                </Button>
                            </Link>

                            {/* Mark Ready — only when PLANNING */}
                            {detail.status === 'PLANNING' && (
                                <Button
                                    size="sm"
                                    className="gap-1.5 text-xs h-8"
                                    disabled={markReady.isPending}
                                    onClick={handleMarkReady}
                                >
                                    {markReady.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Send className="h-3 w-3" />
                                    )}
                                    Mark Ready for Scheduling
                                </Button>
                            )}

                            {detail.status === 'READY_FOR_SCHEDULING' && (
                                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-xs gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    Ready for Scheduling
                                </Badge>
                            )}
                            {detail.status === 'SCHEDULED' && (
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

                    {/* ── Safety Progress Strip (driven by backend truth) ── */}
                    <div className="border-t px-4 sm:px-5 py-3 bg-muted/30">
                        <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {completedCount}/{checklist.length}
                            </span>

                            <div className="flex items-center gap-1.5 flex-1">
                                {checklist.map((item) => (
                                    <Tooltip key={item.key}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className={cn(
                                                    'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
                                                    item.done
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {item.done ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <Circle className="h-3 w-3" />
                                                )}
                                                <span className="hidden md:inline">{item.label}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{item.done ? `✓ ${item.label}` : `○ ${item.label} — required`}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-500',
                                            progressPct === 100 ? 'bg-emerald-500' : 'bg-primary',
                                        )}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {progressPct}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Theater Booking Info */}
                    {detail.theaterBooking && (
                        <div className="border-t px-4 sm:px-5 py-2.5 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50/50">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="font-medium">
                                {format(new Date(detail.theaterBooking.startTime), 'EEEE, MMM d, yyyy • HH:mm')}
                            </span>
                            {detail.theaterBooking.theaterName && (
                                <span className="text-muted-foreground">— {detail.theaterBooking.theaterName}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Alerts Panel (missing items awareness) ────── */}
                {detail.status === 'PLANNING' && checklist.some(c => !c.done) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-800">
                                    {checklist.filter(c => !c.done).length} item{checklist.filter(c => !c.done).length !== 1 ? 's' : ''} remaining before this case can be marked ready
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {checklist.filter(c => !c.done).map(item => {
                                        const tab = keyToTab[item.key];
                                        return (
                                            <button
                                                key={item.key}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                                                    'bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors',
                                                    tab ? 'cursor-pointer' : 'cursor-default opacity-75',
                                                )}
                                                onClick={() => {
                                                    if (tab) {
                                                        setActiveTab(tab);
                                                        // Scroll to top of tab content
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                            >
                                                <Circle className="h-2.5 w-2.5" />
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Operative Timeline (read-only, for active cases) ── */}
                {OPERATIVE_STATUSES.has(detail.status) && (
                    <ReadOnlyTimelineSummary caseId={caseId} />
                )}

                {/* ── Tabbed Workspace ────────────────────────────── */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start gap-1 p-1 bg-muted/40 rounded-lg h-auto">
                        <NavTab value="clinical" icon={FileText} label="Clinical Plan" />
                        <NavTab value="consents" icon={Shield} label="Consents" count={detail.casePlan?.consents.length} />
                        <NavTab value="photos" icon={Camera} label="Photos" count={detail.casePlan?.images.length} />
                        <NavTab value="team" icon={Users} label="Team" count={detail.casePlan?.procedureRecord?.staff.length} />
                    </TabsList>

                    <div className="mt-4 rounded-xl border bg-card shadow-sm overflow-hidden">
                        <TabsContent value="clinical" className="m-0 p-5 sm:p-6 lg:p-8">
                            <ClinicalPlanTab
                                casePlan={legacyPlan}
                                onSave={handleSaveClinical}
                                saving={updatePlan.isPending}
                            />
                        </TabsContent>

                        <TabsContent value="consents" className="m-0 p-5 sm:p-6 lg:p-8">
                            <ConsentsTab casePlan={legacyPlan} caseId={caseId} />
                        </TabsContent>

                        <TabsContent value="photos" className="m-0 p-5 sm:p-6 lg:p-8">
                            <PhotosTab casePlan={legacyPlan} caseId={caseId} />
                        </TabsContent>

                        <TabsContent value="team" className="m-0 p-5 sm:p-6 lg:p-8">
                            <TeamTab casePlan={legacyPlan} caseId={caseId} />
                        </TabsContent>
                    </div>
                </Tabs>

                {/* ── Missing Items Modal ─────────────────────────── */}
                <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-amber-700">
                                <AlertCircle className="h-5 w-5" />
                                Cannot Mark Ready
                            </DialogTitle>
                            <DialogDescription>
                                The following items must be completed before this case can be marked ready for scheduling.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 py-2">
                            {missingItems.map(item => {
                                const tab = keyToTab[item.key];
                                return (
                                    <div
                                        key={item.key}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors',
                                            item.done
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : 'bg-red-50/50 border-red-200',
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {item.done ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                            )}
                                            <span className={cn(
                                                'text-sm font-medium',
                                                item.done ? 'text-emerald-700' : 'text-red-700',
                                            )}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {!item.done && tab && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                                                onClick={() => {
                                                    setShowMissingModal(false);
                                                    setActiveTab(tab);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                Go to →
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMissingModal(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* ── Edit Details Modal ──────────────────────────── */}
                <Dialog open={showEditDetails} onOpenChange={setShowEditDetails}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Case Details</DialogTitle>
                            <DialogDescription>
                                Update the core surgical case information.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="procedureName">Procedure Name</Label>
                                <Input
                                    id="procedureName"
                                    value={editDetailsForm.procedureName}
                                    onChange={(e) => setEditDetailsForm(prev => ({ ...prev, procedureName: e.target.value }))}
                                    placeholder="e.g. Total Knee Replacement"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="side">Laterality (Side)</Label>
                                <Select
                                    value={editDetailsForm.side}
                                    onValueChange={(val) => setEditDetailsForm(prev => ({ ...prev, side: val }))}
                                >
                                    <SelectTrigger id="side">
                                        <SelectValue placeholder="Select side" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LEFT">Left</SelectItem>
                                        <SelectItem value="RIGHT">Right</SelectItem>
                                        <SelectItem value="BILATERAL">Bilateral</SelectItem>
                                        <SelectItem value="MIDLINE">Midline / N/A</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="diagnosis">Diagnosis</Label>
                                <Input
                                    id="diagnosis"
                                    value={editDetailsForm.diagnosis}
                                    onChange={(e) => setEditDetailsForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    placeholder="e.g. Osteoarthritis"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDetails(false)}>Cancel</Button>
                            <Button onClick={handleSaveDetails} disabled={updatePlan.isPending}>
                                {updatePlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </TooltipProvider>
    );
}

// ─── Tab Trigger with optional count ────────────────────────────────────

function NavTab({ value, icon: Icon, label, count }: {
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    count?: number;
}) {
    return (
        <TabsTrigger
            value={value}
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground',
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && count > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                    {count}
                </span>
            )}
        </TabsTrigger>
    );
}

// ─── Read-Only Operative Timeline ───────────────────────────────────────

function ReadOnlyTimelineSummary({ caseId }: { caseId: string }) {
    const [data, setData] = useState<TimelineResultDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = getToken();
        fetch(`/api/theater-tech/surgical-cases/${caseId}/timeline`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setData(json.data);
                } else {
                    setError(json.error || 'Failed to load timeline');
                }
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [caseId]);

    if (loading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) return null; // Graceful fallback — don't block doctor flow

    const { timeline, durations } = data;
    const hasAnyTimestamp = TIMELINE_FIELD_ORDER.some(
        (f) => timeline[f as keyof typeof timeline] != null,
    );

    if (!hasAnyTimestamp) return null; // Nothing recorded yet — no reason to show

    return (
        <Card className="border-slate-200">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-100 text-cyan-600 shrink-0">
                        <Timer className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">Operative Timeline</h3>
                    <Badge variant="secondary" className="text-[10px] font-medium">
                        {data.caseStatus.replace(/_/g, ' ')}
                    </Badge>
                </div>

                {/* Timestamps grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {TIMELINE_FIELD_ORDER.map((field) => {
                        const label = TIMELINE_FIELD_LABELS[field as TimelineFieldName];
                        const value = timeline[field as keyof typeof timeline];
                        return (
                            <div
                                key={field}
                                className={cn(
                                    'rounded-lg border px-3 py-2.5',
                                    value ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/50',
                                )}
                            >
                                <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
                                <p className={cn('text-sm font-medium', value ? 'text-slate-800' : 'text-slate-400')}>
                                    {value ? format(parseISO(value), 'HH:mm') : '—'}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Derived durations */}
                {durations && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Durations
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                            {[
                                { label: 'OR Time', value: durations.orTimeMinutes },
                                { label: 'Surgery', value: durations.surgeryTimeMinutes },
                                { label: 'Prep', value: durations.prepTimeMinutes },
                                { label: 'Close-out', value: durations.closeOutTimeMinutes },
                                { label: 'Anesthesia', value: durations.anesthesiaTimeMinutes },
                            ].map((d) => (
                                <div key={d.label} className="flex items-baseline gap-1.5">
                                    <span className="text-muted-foreground">{d.label}:</span>
                                    <span className="font-medium text-slate-800">
                                        {d.value !== null && d.value !== undefined ? `${d.value} min` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Skeleton ───────────────────────────────────────────────────────────

function PlanPageSkeleton() {
    return (
        <div className="space-y-5 pb-16">
            <Skeleton className="h-8 w-24" />
            <Card>
                <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-20 rounded-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
            <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-28 rounded-md" />
                ))}
            </div>
            <Card>
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
