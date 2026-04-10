'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDoctorSurgicalCases } from '@/hooks/doctor/useSurgicalCases';
import {
    SurgicalCaseListItemDto,
    SurgicalCaseMetrics,
    SurgicalCaseQueryParams,
} from '@/lib/api/surgical-cases';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Scissors,
    AlertCircle,
    Calendar,
    User,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    FileText,
    Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100' },
    PLANNING: { label: 'Planning', color: 'text-blue-700', bg: 'bg-blue-100' },
    READY_FOR_SCHEDULING: { label: 'Ready', color: 'text-cyan-700', bg: 'bg-cyan-100' },
    SCHEDULED: { label: 'Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    IN_PREP: { label: 'In Prep', color: 'text-amber-700', bg: 'bg-amber-100' },
    IN_THEATER: { label: 'In Theater', color: 'text-red-700', bg: 'bg-red-100' },
    RECOVERY: { label: 'Recovery', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
    ELECTIVE: { label: 'Elective', className: 'text-slate-500' },
    URGENT: { label: 'Urgent', className: 'text-amber-600' },
    EMERGENCY: { label: 'Emergency', className: 'text-red-600' },
};

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'READY_FOR_SCHEDULING', label: 'Ready' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PREP,IN_THEATER,RECOVERY', label: 'Active' },
    { value: 'COMPLETED,CANCELLED', label: 'Done' },
] as const;

function getTabCount(metrics: SurgicalCaseMetrics | undefined, tabValue: string): number | undefined {
    if (!metrics) return undefined;
    switch (tabValue) {
        case '': return metrics.total;
        case 'DRAFT': return metrics.draft;
        case 'PLANNING': return metrics.planning;
        case 'READY_FOR_WARD_PREP': return metrics.readyForWardPrep;
        case 'SCHEDULED': return metrics.scheduled;
        case 'IN_PREP,IN_THEATER,RECOVERY': return metrics.inProgress;
        case 'COMPLETED,CANCELLED': return metrics.completed + metrics.cancelled;
        default: return undefined;
    }
}

export default function DoctorSurgicalCasesPage() {
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const searchTimeoutRef = useMemo(() => ({ current: null as NodeJS.Timeout | null }), []);
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearch(value);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setDebouncedSearch(value);
                setPage(1);
            }, 350);
        },
        [searchTimeoutRef],
    );

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

    const handleTabChange = useCallback((value: string) => {
        setStatusFilter(value);
        setPage(1);
    }, []);

    const handleUrgencyChange = useCallback((value: string) => {
        setUrgencyFilter(value === 'ALL' ? '' : value);
        setPage(1);
    }, []);

    const navigateToCase = useCallback(
        (caseId: string) => router.push(`/doctor/surgical-cases/${caseId}`),
        [router],
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Your Interventions</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Surgical Cases</h1>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                    { label: 'Total', value: metrics?.total, color: 'text-foreground' },
                    { label: 'Draft', value: metrics?.draft, color: 'text-slate-600' },
                    { label: 'Planning', value: metrics?.planning, color: 'text-blue-600' },
                    { label: 'Ward Prep', value: metrics?.readyForWardPrep, color: 'text-cyan-600' },
                    { label: 'Scheduled', value: metrics?.scheduled, color: 'text-indigo-600' },
                    { label: 'Active', value: metrics?.inProgress, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                    <Card key={label} className="shadow-none border">
                        <CardContent className="p-3">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                {label}
                            </span>
                            <p className={cn('text-xl font-bold', color)}>{value ?? 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
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
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:bg-muted',
                            )}
                        >
                            {tab.label}
                            {count !== undefined && (
                                <span className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patient, procedure, diagnosis..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 h-9 text-sm"
                    />
                </div>

                <select
                    className="h-9 px-3 text-sm border rounded-md bg-background"
                    value={urgencyFilter || 'ALL'}
                    onChange={(e) => handleUrgencyChange(e.target.value)}
                >
                    <option value="ALL">All Urgencies</option>
                    <option value="ELECTIVE">Elective</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                </select>

                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse self-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Updating...
                    </div>
                )}
            </div>

            <Separator />

            {/* Table */}
            {isLoading ? (
                <TableSkeleton />
            ) : error ? (
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="mt-2 text-destructive">{error.message}</p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : items.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center p-16 text-center">
                        <Scissors className="h-8 w-8 text-muted-foreground" />
                        <h3 className="mt-4 font-semibold">No Surgical Cases</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Click "Plan Surgery" on a completed consultation in the Consultations Hub to create a case.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Patient</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Procedure</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Diagnosis</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Surgeon</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-500">Urgency</th>
                                <th className="text-center px-4 py-3 font-medium text-slate-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((sc) => {
                                const status = STATUS_CONFIG[sc.status] ?? STATUS_CONFIG.DRAFT;
                                const urgency = URGENCY_CONFIG[sc.urgency] ?? URGENCY_CONFIG.ELECTIVE;
                                const patientName = sc.patient
                                    ? `${sc.patient.firstName} ${sc.patient.lastName}`
                                    : 'Unknown';
                                
                                return (
                                    <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <Badge className={cn(status.bg, status.color)}>
                                                {status.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                                                    {sc.patient?.firstName?.[0] || '?'}{sc.patient?.lastName?.[0] || ''}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium text-slate-900 truncate">{patientName}</span>
                                                    {sc.patient?.fileNumber && (
                                                        <span className="text-xs text-slate-400 font-mono truncate">
                                                            {sc.patient.fileNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="line-clamp-1 text-sm">
                                                {sc.procedures && sc.procedures.length > 0
                                                    ? sc.procedures.map(p => p.name).join(', ')
                                                    : sc.procedureName || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="line-clamp-1 text-sm text-slate-500">
                                                {sc.diagnosis || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm">{sc.primarySurgeon?.name || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {sc.procedureDate ? (
                                                <span className="text-sm text-slate-600">
                                                    {format(new Date(sc.procedureDate), 'MMM d, yyyy')}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('text-xs font-medium', urgency.className)}>
                                                {urgency.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigateToCase(sc.id)}
                                                className="h-7 gap-1.5"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                        Showing <span className="font-medium">{(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)}</span> of{' '}
                        <span className="font-medium">{meta.total}</span> cases
                    </p>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={meta.page <= 1}
                            onClick={() => setPage(meta.page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium tabular-nums px-2">
                            {meta.page} / {meta.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={meta.page >= meta.totalPages}
                            onClick={() => setPage(meta.page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        {['Status', 'Patient', 'Procedure', 'Diagnosis', 'Surgeon', 'Date', 'Urgency', 'Action'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-medium text-slate-500">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                                <td key={j} className="px-4 py-3">
                                    <Skeleton className="h-5 w-full" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}