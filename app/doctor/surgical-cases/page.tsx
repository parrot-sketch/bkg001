'use client';

/**
 * Doctor Surgical Cases Page
 *
 * Professional, clinic-grade case list with:
 * - Metrics bar (counts by status)
 * - Status filter tabs (All, Draft, Planning, Ready, Scheduled, Active, Done)
 * - Search (patient name, procedure, diagnosis)
 * - Urgency filter
 * - Server-paginated list with context-aware CTAs
 * - Loading skeletons + empty states
 */

import { useState, useCallback, useMemo } from 'react';
import { useDoctorSurgicalCases, useMarkCaseReady } from '@/hooks/doctor/useSurgicalCases';
import {
    SurgicalCaseListItemDto,
    SurgicalCaseMetrics,
    SurgicalCaseQueryParams,
} from '@/lib/api/surgical-cases';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
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
    Search,
    ChevronLeft,
    ChevronRight,
    FileText,
    Activity,
    Eye,
    ClipboardList,
    Stethoscope,
    ShieldCheck,
    ImageIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// ═══════════════════════════════════════════════════════════════════════
// Config — status & urgency visual mappings
// ═══════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
    DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100', icon: FileText },
    PLANNING: { label: 'Planning', color: 'text-blue-700', bg: 'bg-blue-100', icon: ClipboardList },
    READY_FOR_SCHEDULING: { label: 'Ready', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: CalendarCheck },
    SCHEDULED: { label: 'Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: Calendar },
    IN_PREP: { label: 'In Prep', color: 'text-amber-800', bg: 'bg-amber-100', icon: Clock },
    IN_THEATER: { label: 'In Theater', color: 'text-red-700', bg: 'bg-red-100', icon: Scissors },
    RECOVERY: { label: 'Recovery', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Activity },
    COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
    ELECTIVE: { label: 'Elective', className: 'border-slate-200 text-slate-500 bg-slate-50' },
    URGENT: { label: 'Urgent', className: 'border-amber-300 text-amber-700 bg-amber-50' },
    EMERGENCY: { label: 'Emergency', className: 'border-red-300 text-red-700 bg-red-50' },
};

// Status filter tabs — value maps to API filter value
const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'READY_FOR_SCHEDULING', label: 'Ready' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PREP,IN_THEATER,RECOVERY', label: 'Active' },
    { value: 'COMPLETED,CANCELLED', label: 'Done' },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Helpers — CTA mapping (no business logic in components)
// ═══════════════════════════════════════════════════════════════════════

interface CaseAction {
    label: string;
    href: string | null;
    disabled: boolean;
    reason?: string;
    variant: 'default' | 'outline' | 'ghost' | 'secondary';
}

/**
 * Determines the primary CTA for a surgical case based on its status
 * and available navigation targets.
 *
 * Primary route: /doctor/surgical-cases/[caseId]/plan (case-centric)
 * Fallback: /doctor/operative/plan/[appointmentId]/new (legacy, if case route missing)
 */
function getCasePrimaryAction(sc: SurgicalCaseListItemDto): CaseAction {
    // Primary route — case-centric plan page (always available since we have caseId)
    const caseRoute = `/doctor/surgical-cases/${sc.id}/plan`;

    // Legacy fallback — appointment-centric (kept for backward compat)
    const appointmentId = sc.casePlan?.appointmentId ?? sc.consultation?.appointmentId ?? null;
    const legacyRoute = appointmentId ? `/doctor/operative/plan/${appointmentId}/new` : null;

    // Prefer case route; fall back to legacy if needed (though case route always works)
    const planRoute = caseRoute;

    switch (sc.status) {
        case 'DRAFT':
            return { label: 'Plan Surgery', href: planRoute, disabled: false, variant: 'default' };

        case 'PLANNING':
            return { label: 'Continue Plan', href: planRoute, disabled: false, variant: 'default' };

        case 'READY_FOR_SCHEDULING':
            return { label: 'View Plan', href: planRoute, disabled: false, variant: 'outline' };

        case 'SCHEDULED':
            return { label: 'View Booking', href: planRoute, disabled: false, variant: 'outline' };

        case 'IN_PREP':
        case 'IN_THEATER':
        case 'RECOVERY':
            return { label: 'Open Case', href: planRoute, disabled: false, variant: 'secondary' };

        case 'COMPLETED':
        case 'CANCELLED':
            return { label: 'View Summary', href: planRoute, disabled: false, variant: 'ghost' };

        default:
            return { label: 'View', href: planRoute, disabled: false, variant: 'ghost' };
    }
}

/** Map a metric key to a tab count display. */
function getTabCount(metrics: SurgicalCaseMetrics | undefined, tabValue: string): number | undefined {
    if (!metrics) return undefined;
    switch (tabValue) {
        case '': return metrics.total;
        case 'DRAFT': return metrics.draft;
        case 'PLANNING': return metrics.planning;
        case 'READY_FOR_SCHEDULING': return metrics.readyForScheduling;
        case 'SCHEDULED': return metrics.scheduled;
        case 'IN_PREP,IN_THEATER,RECOVERY': return metrics.inProgress;
        case 'COMPLETED,CANCELLED': return metrics.completed + metrics.cancelled;
        default: return undefined;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════

export default function DoctorSurgicalCasesPage() {
    const router = useRouter();
    const markReady = useMarkCaseReady();

    // ─── Filter state ────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Debounce search input
    const searchTimeoutRef = useMemo(() => ({ current: null as NodeJS.Timeout | null }), []);
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearch(value);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setDebouncedSearch(value);
                setPage(1); // Reset to page 1 on search change
            }, 350);
        },
        [searchTimeoutRef],
    );

    // Build query params
    const queryParams: SurgicalCaseQueryParams = useMemo(
        () => ({
            q: debouncedSearch || undefined,
            status: statusFilter || undefined,
            urgency: urgencyFilter || undefined,
            page,
            pageSize,
        }),
        [debouncedSearch, statusFilter, urgencyFilter, page, pageSize],
    );

    const { data, isLoading, isFetching, error } = useDoctorSurgicalCases(queryParams);

    const items = data?.items ?? [];
    const meta = data?.meta;
    const metrics = data?.metrics;

    // ─── Tab change ──────────────────────────────────────────────────
    const handleTabChange = useCallback((value: string) => {
        setStatusFilter(value);
        setPage(1);
    }, []);

    const handleUrgencyChange = useCallback((value: string) => {
        setUrgencyFilter(value === 'ALL' ? '' : value);
        setPage(1);
    }, []);

    // ─── Navigation ──────────────────────────────────────────────────
    const handleNavigate = useCallback(
        (href: string) => router.push(href),
        [router],
    );

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                {/* ── Header ─────────────────────────────────────────── */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Surgical Cases</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and track your surgical cases from planning through completion.
                    </p>
                </div>

                {/* ── Metrics Bar ────────────────────────────────────── */}
                <CaseMetricsBar metrics={metrics} isLoading={isLoading} />

                {/* ── Status Filter Tabs ─────────────────────────────── */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                    {STATUS_TABS.map((tab) => {
                        const count = getTabCount(metrics, tab.value);
                        const isActive = statusFilter === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => handleTabChange(tab.value)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all border',
                                    isActive
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {tab.label}
                                {count !== undefined && (
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none min-w-[18px] text-center',
                                            isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Filters Row ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patient, procedure, diagnosis…"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>

                    {/* Urgency */}
                    <Select value={urgencyFilter || 'ALL'} onValueChange={handleUrgencyChange}>
                        <SelectTrigger className="w-[160px] h-9 text-sm">
                            <SelectValue placeholder="Urgency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Urgencies</SelectItem>
                            <SelectItem value="ELECTIVE">Elective</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                            <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Fetch indicator */}
                    {isFetching && !isLoading && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse self-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Updating…
                        </div>
                    )}
                </div>

                <Separator />

                {/* ── List ────────────────────────────────────────────── */}
                {isLoading ? (
                    <CaseListSkeleton />
                ) : error ? (
                    <ErrorState message={error.message} />
                ) : items.length === 0 ? (
                    <EmptyState
                        hasFilters={!!(debouncedSearch || statusFilter || urgencyFilter)}
                        onClearFilters={() => {
                            setSearch('');
                            setDebouncedSearch('');
                            setStatusFilter('');
                            setUrgencyFilter('');
                            setPage(1);
                        }}
                    />
                ) : (
                    <div className="grid gap-3">
                        {items.map((sc) => (
                            <CaseCard
                                key={sc.id}
                                surgicalCase={sc}
                                onMarkReady={() => markReady.mutate(sc.id)}
                                markingReady={markReady.isPending}
                                onNavigate={handleNavigate}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {meta && meta.totalPages > 1 && (
                    <PaginationBar
                        page={meta.page}
                        totalPages={meta.totalPages}
                        total={meta.total}
                        pageSize={meta.pageSize}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════

// ─── Metrics Bar ────────────────────────────────────────────────────

function CaseMetricsBar({
    metrics,
    isLoading,
}: {
    metrics: SurgicalCaseMetrics | undefined;
    isLoading: boolean;
}) {
    const items = [
        { label: 'Total', value: metrics?.total, icon: ClipboardList, color: 'text-foreground' },
        { label: 'Needs Plan', value: metrics?.draft, icon: FileText, color: 'text-slate-600' },
        { label: 'Planning', value: metrics?.planning, icon: Stethoscope, color: 'text-blue-600' },
        { label: 'Ready', value: metrics?.readyForScheduling, icon: ShieldCheck, color: 'text-cyan-600' },
        { label: 'Scheduled', value: metrics?.scheduled, icon: Calendar, color: 'text-indigo-600' },
        { label: 'Active', value: metrics?.inProgress, icon: Activity, color: 'text-red-600' },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="shadow-none border">
                        <CardContent className="p-3">
                            <Skeleton className="h-3 w-12 mb-2" />
                            <Skeleton className="h-6 w-8" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {items.map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="shadow-none border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={cn('h-3.5 w-3.5', color)} />
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                {label}
                            </span>
                        </div>
                        <p className={cn('text-xl font-bold tabular-nums', color)}>
                            {value ?? 0}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Case Card ──────────────────────────────────────────────────────

function CaseCard({
    surgicalCase: sc,
    onMarkReady,
    markingReady,
    onNavigate,
}: {
    surgicalCase: SurgicalCaseListItemDto;
    onMarkReady?: () => void;
    markingReady?: boolean;
    onNavigate: (href: string) => void;
}) {
    const status = STATUS_CONFIG[sc.status] ?? STATUS_CONFIG.DRAFT;
    const StatusIcon = status.icon;
    const urgency = URGENCY_CONFIG[sc.urgency] ?? URGENCY_CONFIG.ELECTIVE;
    const patientName = sc.patient
        ? `${sc.patient.firstName} ${sc.patient.lastName}`
        : 'Unknown Patient';
    const action = getCasePrimaryAction(sc);

    // Urgency Strip Color
    const urgencyColor = sc.urgency === 'EMERGENCY' ? 'bg-red-500' :
        sc.urgency === 'URGENT' ? 'bg-amber-500' :
            'bg-slate-200';

    return (
        <Card className="group relative overflow-hidden transition-all hover:shadow-md border-l-0">
            {/* Urgency Strip */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", urgencyColor)} />

            <CardContent className="p-4 pl-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                    {/* ── Section 1: Header & Patient (Col span 4) ── */}
                    <div className="md:col-span-4 flex flex-col justify-between h-full space-y-2">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Badge
                                    variant="secondary"
                                    className={cn('text-[10px] px-1.5 py-0 h-5 gap-1 font-medium', status.bg, status.color)}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                </Badge>
                                {sc.urgency !== 'ELECTIVE' && (
                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', urgency.className)}>
                                        {urgency.label}
                                    </Badge>
                                )}
                            </div>
                            <h3 className="font-semibold text-base text-foreground leading-tight line-clamp-1" title={sc.procedureName || 'Procedure recommended'}>
                                {sc.procedureName || 'Procedure recommended'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                    <User className="h-3.5 w-3.5" />
                                    {patientName}
                                </span>
                                {sc.patient?.fileNumber && (
                                    <span className="font-mono text-[10px] bg-muted px-1.5 rounded-sm">
                                        {sc.patient.fileNumber}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Mobile-only spacer/divider could go here if needed */}
                    </div>

                    {/* ── Section 2: Clinical Details (Col span 5) ── */}
                    <div className="md:col-span-5 flex flex-col gap-3 justify-center border-l md:pl-4 border-dashed md:border-solid border-slate-100">
                        {/* Diagnosis with better clamping */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Diagnosis</span>
                            <p className="text-xs text-foreground/90 leading-relaxed line-clamp-2" title={sc.diagnosis || 'No diagnosis recorded'}>
                                {sc.diagnosis || <span className="text-muted-foreground italic">No diagnosis recorded</span>}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {sc.side && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-semibold text-slate-400">Side:</span>
                                    <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5">
                                        {sc.side}
                                    </Badge>
                                </div>
                            )}
                            {sc.casePlan?.plannedAnesthesia && (
                                <div className="flex items-center gap-1.5">
                                    <Stethoscope className="h-3 w-3" />
                                    <span>{sc.casePlan.plannedAnesthesia.replace(/_/g, ' ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Section 3: Logistics & Action (Col span 3) ── */}
                    <div className="md:col-span-3 flex flex-col justify-between items-end gap-3 md:pl-2">

                        {/* Theater Info */}
                        <div className="w-full text-right">
                            {sc.theaterBooking ? (
                                <div className="inline-flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md mb-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(sc.theaterBooking.startTime), 'MMM d, HH:mm')}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {sc.theaterBooking.theaterName}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    No booking
                                </span>
                            )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center gap-2 w-full justify-end mt-auto">
                            {sc.casePlan && (
                                <ReadinessIndicator
                                    readinessStatus={sc.casePlan.readinessStatus}
                                    hasPlan={sc.casePlan.hasProcedurePlan}
                                    hasRisks={sc.casePlan.hasRiskFactors}
                                    consents={sc.casePlan.consentCount}
                                    images={sc.casePlan.imageCount}
                                />
                            )}

                            {/* Mark Ready Button */}
                            {sc.status === 'PLANNING' && onMarkReady && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 rounded-full text-blue-600 hover:bg-blue-50"
                                    disabled={markingReady}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkReady();
                                    }}
                                    title="Mark Ready for Scheduling"
                                >
                                    {markingReady ? (
                                        <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            )}

                            {/* Main Action */}
                            <Button
                                size="sm"
                                variant={action.variant}
                                className={cn("text-xs h-7 gap-1.5 shadow-sm transition-all", action.variant === 'default' && "bg-slate-900 hover:bg-slate-800")}
                                onClick={() => action.href && onNavigate(action.href)}
                                disabled={action.disabled}
                            >
                                {action.label}
                                <ArrowRight className="h-3 w-3 opacity-70" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Readiness Indicator ────────────────────────────────────────────

function ReadinessIndicator({
    readinessStatus,
    hasPlan,
    hasRisks,
    consents,
    images,
}: {
    readinessStatus: string;
    hasPlan: boolean;
    hasRisks: boolean;
    consents: number;
    images: number;
}) {
    // Compute a quick readiness score (out of 4 key items)
    const completed = [hasPlan, hasRisks, consents > 0, images > 0].filter(Boolean).length;

    if (readinessStatus === 'READY') {
        return (
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Ready
            </Badge>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                    {completed}/4 items
                </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
                <div className="space-y-1 text-xs">
                    <div className={hasPlan ? 'text-green-600' : 'text-muted-foreground'}>
                        {hasPlan ? '✓' : '○'} Procedure plan
                    </div>
                    <div className={hasRisks ? 'text-green-600' : 'text-muted-foreground'}>
                        {hasRisks ? '✓' : '○'} Risk assessment
                    </div>
                    <div className={consents > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                        {consents > 0 ? '✓' : '○'} Consent forms ({consents})
                    </div>
                    <div className={images > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                        {images > 0 ? '✓' : '○'} Pre-op photos ({images})
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

// ─── Pagination Bar ─────────────────────────────────────────────────

function PaginationBar({
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}) {
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
                <span className="font-medium text-foreground">{total}</span> cases
            </p>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium tabular-nums px-2">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// ─── Skeleton Loader ────────────────────────────────────────────────

function CaseListSkeleton() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                    <Skeleton className="h-5 w-14 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-48" />
                                <div className="flex gap-3">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-7 w-24 rounded" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Error State ────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
    return (
        <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                    <h3 className="font-semibold text-destructive">Failed to load cases</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="mt-2"
                >
                    Retry
                </Button>
            </CardContent>
        </Card>
    );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({
    hasFilters,
    onClearFilters,
}: {
    hasFilters: boolean;
    onClearFilters: () => void;
}) {
    const router = useRouter();

    if (hasFilters) {
        return (
            <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                    <div className="bg-muted p-4 rounded-full">
                        <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">No matching cases</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Try adjusting your search or filters.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onClearFilters}>
                        Clear Filters
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                <div className="bg-muted p-4 rounded-full">
                    <Scissors className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">No Surgical Cases</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Surgical cases are created automatically when a consultation
                        outcome is &quot;Procedure Recommended&quot; and the patient agrees.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/doctor/queue')}
                >
                    Go to Consultations
                </Button>
            </CardContent>
        </Card>
    );
}
