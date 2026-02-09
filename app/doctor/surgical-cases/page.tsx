'use client';

/**
 * Doctor Surgical Cases Page
 *
 * Lists all surgical cases assigned to the authenticated doctor.
 * Provides quick navigation to operative plans and shows case status progression.
 */

import { useDoctorSurgicalCases, useMarkCaseReady } from '@/hooks/doctor/useSurgicalCases';
import { SurgicalCaseListDto } from '@/lib/api/surgical-cases';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Loader2,
    Scissors,
    ArrowRight,
    AlertCircle,
    Calendar,
    User,
    Send,
    CalendarCheck,
    Clock,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Status Config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
    PLANNING: { label: 'Planning', color: 'bg-blue-100 text-blue-700', icon: Scissors },
    READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', color: 'bg-cyan-100 text-cyan-700', icon: CalendarCheck },
    SCHEDULED: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-700', icon: Calendar },
    IN_PREP: { label: 'In Prep', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    IN_THEATER: { label: 'In Theater', color: 'bg-red-100 text-red-700', icon: Scissors },
    RECOVERY: { label: 'Recovery', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const URGENCY_CONFIG: Record<string, string> = {
    ELECTIVE: 'border-gray-200 text-gray-500',
    URGENT: 'border-amber-300 text-amber-700 bg-amber-50',
    EMERGENCY: 'border-red-300 text-red-700 bg-red-50',
};

export default function DoctorSurgicalCasesPage() {
    const { data: cases, isLoading, error } = useDoctorSurgicalCases();
    const markReady = useMarkCaseReady();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading surgical cases…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-3 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm font-medium">{error.message}</p>
            </div>
        );
    }

    // Group by status for summary
    const statusGroups = (cases ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {});

    const activeCases = (cases ?? []).filter(c => !['COMPLETED', 'CANCELLED'].includes(c.status));
    const completedCases = (cases ?? []).filter(c => ['COMPLETED', 'CANCELLED'].includes(c.status));

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Surgical Cases</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage and track your surgical cases from planning through completion.
                </p>
            </div>

            {/* Status Summary Strip */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(statusGroups).map(([status, count]) => {
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
                    return (
                        <Badge
                            key={status}
                            variant="outline"
                            className={cn('text-xs gap-1 px-2.5 py-1', config.color)}
                        >
                            {config.label}: {count}
                        </Badge>
                    );
                })}
                {(cases ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No surgical cases yet.</p>
                )}
            </div>

            {/* Empty State */}
            {(cases ?? []).length === 0 && (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                        <div className="bg-muted p-4 rounded-full">
                            <Scissors className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">No Surgical Cases</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Surgical cases are created automatically when a consultation outcome
                                is &quot;Procedure Recommended&quot; and the patient agrees.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Cases */}
            {activeCases.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Active Cases ({activeCases.length})
                    </h2>
                    <div className="grid gap-3">
                        {activeCases.map((sc) => (
                            <CaseCard
                                key={sc.id}
                                surgicalCase={sc}
                                onMarkReady={() => markReady.mutate(sc.id)}
                                markingReady={markReady.isPending}
                                onNavigate={() => {
                                    if (sc.casePlan?.appointmentId) {
                                        router.push(`/doctor/operative/plan/${sc.casePlan.appointmentId}/new`);
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed / Cancelled Cases */}
            {completedCases.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Past Cases ({completedCases.length})
                    </h2>
                    <div className="grid gap-3">
                        {completedCases.map((sc) => (
                            <CaseCard
                                key={sc.id}
                                surgicalCase={sc}
                                onNavigate={() => {
                                    if (sc.casePlan?.appointmentId) {
                                        router.push(`/doctor/operative/plan/${sc.casePlan.appointmentId}/new`);
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Case Card ─────────────────────────────────────────────────────────
function CaseCard({
    surgicalCase,
    onMarkReady,
    markingReady,
    onNavigate,
}: {
    surgicalCase: SurgicalCaseListDto;
    onMarkReady?: () => void;
    markingReady?: boolean;
    onNavigate: () => void;
}) {
    const statusConfig = STATUS_CONFIG[surgicalCase.status] || STATUS_CONFIG.DRAFT;
    const StatusIcon = statusConfig.icon;
    const urgencyClass = URGENCY_CONFIG[surgicalCase.urgency] || URGENCY_CONFIG.ELECTIVE;
    const patientName = surgicalCase.patient
        ? `${surgicalCase.patient.firstName} ${surgicalCase.patient.lastName}`
        : 'Unknown Patient';

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Main info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                                variant="secondary"
                                className={cn('text-xs gap-1', statusConfig.color)}
                            >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={cn('text-[10px]', urgencyClass)}
                            >
                                {surgicalCase.urgency}
                            </Badge>
                        </div>

                        <h3 className="font-semibold text-foreground text-sm mt-2">
                            {surgicalCase.procedureName || 'Procedure TBD'}
                        </h3>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {patientName}
                            </span>
                            {surgicalCase.patient?.fileNumber && (
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                    {surgicalCase.patient.fileNumber}
                                </span>
                            )}
                        </div>

                        {surgicalCase.diagnosis && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                Dx: {surgicalCase.diagnosis}
                            </p>
                        )}

                        {/* Theater Booking Info */}
                        {surgicalCase.theaterBooking && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-indigo-700 bg-indigo-50 rounded-md px-2.5 py-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                    {format(new Date(surgicalCase.theaterBooking.startTime), 'MMM d, yyyy • HH:mm')}
                                    {surgicalCase.theaterBooking.theaterName && (
                                        <> — {surgicalCase.theaterBooking.theaterName}</>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                            {format(new Date(surgicalCase.createdAt), 'MMM d')}
                        </span>

                        <div className="flex items-center gap-1.5">
                            {/* Mark Ready button — only for PLANNING cases */}
                            {surgicalCase.status === 'PLANNING' && onMarkReady && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 gap-1"
                                    disabled={markingReady}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkReady();
                                    }}
                                >
                                    {markingReady ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Send className="h-3 w-3" />
                                    )}
                                    Ready
                                </Button>
                            )}

                            {/* Navigate to operative plan */}
                            {surgicalCase.casePlan?.appointmentId && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 gap-1"
                                    onClick={onNavigate}
                                >
                                    View Plan
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
