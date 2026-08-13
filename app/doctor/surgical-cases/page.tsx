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
    MoreHorizontal,
    ClipboardList,
    Receipt,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'border border-slate-200 bg-slate-100 text-slate-700' },
    PLANNING: { label: 'Planning', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
    READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
    READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
    SCHEDULED: { label: 'Scheduled', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
    IN_PREP: { label: 'In Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
    IN_THEATER: { label: 'In Theater', className: 'border border-red-200 bg-red-50 text-red-700' },
    RECOVERY: { label: 'Recovery', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    COMPLETED: { label: 'Completed', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    CANCELLED: { label: 'Cancelled', className: 'border border-red-200 bg-red-50 text-red-700' },
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
    { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP', label: 'Ward Prep' },
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
        case 'READY_FOR_WARD_PREP,IN_WARD_PREP': return metrics.readyForWardPrep;
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
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
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
            date: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined,
            page,
            pageSize,
        }),
        [debouncedSearch, statusFilter, urgencyFilter, dateFilter, page, pageSize],
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

    const handleDateChange = useCallback((date: Date | undefined) => {
        setDateFilter(date);
        setPage(1);
    }, []);

    const navigateToCase = useCallback(
        (caseId: string) => router.push(`/doctor/surgical-cases/${caseId}/case-plan`),
        [router],
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20">
                <p className="text-xs text-[#caa26a] font-semibold uppercase tracking-widest mb-1">Doctor Workspace</p>
                <h1 className="text-2xl font-bold tracking-tight text-white">Surgical Cases</h1>
                <p className="mt-1 text-sm text-white/80">
                    Follow each case from planning through ward prep, booking, and active surgery.
                </p>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                    { label: 'Total', value: metrics?.total, color: 'text-white', accent: 'text-[#caa26a]' },
                    { label: 'Draft', value: metrics?.draft, color: 'text-white', accent: 'text-slate-300' },
                    { label: 'Planning', value: metrics?.planning, color: 'text-white', accent: 'text-amber-300' },
                    { label: 'Ward Prep', value: metrics?.readyForWardPrep, color: 'text-white', accent: 'text-emerald-300' },
                    { label: 'Scheduled', value: metrics?.scheduled, color: 'text-white', accent: 'text-blue-300' },
                    { label: 'Active', value: metrics?.inProgress, color: 'text-white', accent: 'text-red-300' },
                ].map(({ label, value, color, accent }) => (
                    <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                        <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider block mb-1">
                            {label}
                        </span>
                        <p className={cn('text-2xl font-bold', accent)}>{value ?? 0}</p>
                    </div>
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
                                    ? 'bg-[#caa26a] text-[#2c2e4b] border-[#caa26a] shadow-sm'
                                    : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white',
                            )}
                        >
                            {tab.label}
                            {count !== undefined && (
                                <span className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    isActive ? 'bg-[#2c2e4b]/20 text-[#2c2e4b]' : 'bg-white/10 text-white/60',
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                        placeholder="Search patient, procedure, diagnosis..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-[#caa26a] focus:ring-[#caa26a]/30"
                    />
                </div>

                <div className="w-full sm:w-[160px]">
                    <select
                        className="w-full h-9 px-3 text-sm border rounded-md bg-white/10 border-white/20 text-white focus:border-[#caa26a] focus:outline-none"
                        value={urgencyFilter || 'ALL'}
                        onChange={(e) => handleUrgencyChange(e.target.value)}
                    >
                        <option value="ALL" className="bg-[#2c2e4b] text-white">All Urgencies</option>
                        <option value="ELECTIVE" className="bg-[#2c2e4b] text-white">Elective</option>
                        <option value="URGENT" className="bg-[#2c2e4b] text-white">Urgent</option>
                        <option value="EMERGENCY" className="bg-[#2c2e4b] text-white">Emergency</option>
                    </select>
                </div>

                <div className="w-full sm:w-[180px]">
                    <DatePicker
                        value={dateFilter}
                        onChange={handleDateChange}
                        placeholder="Filter by date..."
                        className="h-9 bg-white/10 border-white/20 text-white"
                    />
                </div>

                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-white/80 animate-pulse self-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#caa26a]" />
                        Updating...
                    </div>
                )}
            </div>

            <div className="border-t border-white/15" />

            {/* Table / States */}
            {isLoading ? (
                <TableSkeleton />
            ) : error ? (
                <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="mt-2 text-red-300 text-sm">{error.message}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="mt-3 border-red-400/30 text-red-300 hover:bg-red-500/10"
                    >
                        Retry
                    </Button>
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white/5 border border-white/15 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center">
                    <Scissors className="h-8 w-8 text-white/60" />
                    <h3 className="mt-4 font-semibold text-white">No Surgical Cases</h3>
                    <p className="text-sm text-white/70 mt-1">
                        Click "Plan Surgery" on a completed consultation in the Consultations Hub to create a case.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-white/20 overflow-hidden shadow-xl shadow-black/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-[#2c2e4b] border-b border-white/10">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider w-[120px]">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider w-[200px]">Patient</th>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider min-w-[150px]">Procedure</th>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider">Diagnosis</th>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider">Surgeon</th>
                                    <th className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider w-[100px]">Urgency</th>
                                    <th className="text-center px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider w-[120px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.map((sc) => {
                                    const status = STATUS_CONFIG[sc.status] ?? STATUS_CONFIG.DRAFT;
                                    const urgency = URGENCY_CONFIG[sc.urgency] ?? URGENCY_CONFIG.ELECTIVE;
                                    const patientName = sc.patient
                                        ? `${sc.patient.firstName} ${sc.patient.lastName}`
                                        : 'Unknown';

                                    return (
                                        <tr key={sc.id} className="hover:bg-[#e7d6bf]/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <Badge className={status.className}>
                                                    {status.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-[#2c2e4b]/10 flex items-center justify-center text-xs font-semibold text-[#2c2e4b] shrink-0">
                                                        {sc.patient?.firstName?.[0] || '?'}{sc.patient?.lastName?.[0] || ''}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-slate-900 truncate">{patientName}</span>
                                                        {sc.patient?.fileNumber && (
                                                            <span className="text-xs text-slate-400 font-mono truncate">
                                                                {sc.patient.fileNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="line-clamp-1 text-sm font-medium text-slate-800">
                                                    {sc.procedures && sc.procedures.length > 0
                                                        ? sc.procedures.map(p => p.name).join(', ')
                                                        : sc.procedureName || '—'}
                                                </span>
                                                <div className="flex gap-1.5 mt-1.5">
                                                    {sc.casePlan?.hasProcedurePlan && <Badge variant="secondary" className="border border-slate-200 px-1.5 py-0 text-[10px] font-medium text-slate-600">Plan</Badge>}
                                                    {sc.casePlan?.hasSurgicalNotes && <Badge variant="secondary" className="border border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] font-medium text-emerald-700">Notes</Badge>}
                                                    {sc.casePlan?.hasChargeSheet && <Badge variant="secondary" className="border border-slate-300 bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-700">Charges</Badge>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="line-clamp-1 text-sm text-slate-500">
                                                    {sc.diagnosis || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-700">{sc.primarySurgeon?.name || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn('text-xs font-semibold', urgency.className)}>
                                                    {urgency.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => navigateToCase(sc.id)}
                                                        className="h-7 gap-1.5 rounded-r-none border-r-0 border-[#2c2e4b]/20 text-[#2c2e4b] hover:bg-[#2c2e4b] hover:text-white"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Open
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 w-7 p-0 rounded-l-none border-[#2c2e4b]/20 text-[#2c2e4b] hover:bg-[#2c2e4b] hover:text-white"
                                                            >
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuLabel className="text-xs">Jump to</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => router.push(`/doctor/surgical-cases/${sc.id}/case-plan`)}>
                                                                <ClipboardList className="h-3.5 w-3.5 mr-2" />
                                                                Case Plan
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/doctor/surgical-cases/${sc.id}/surgical-notes`)}>
                                                                <FileText className="h-3.5 w-3.5 mr-2" />
                                                                Surgical Notes
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/doctor/surgical-cases/${sc.id}/charge-sheet`)}>
                                                                <Receipt className="h-3.5 w-3.5 mr-2" />
                                                                Charge Sheet
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-white/70">
                        Showing <span className="font-medium text-white">{(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)}</span> of{' '}
                        <span className="font-medium text-white">{meta.total}</span> cases
                    </p>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-40"
                            disabled={meta.page <= 1}
                            onClick={() => setPage(meta.page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium tabular-nums px-2 text-white/70">
                            {meta.page} / {meta.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-40"
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
        <div className="bg-white rounded-xl border border-white/20 overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-[#2c2e4b] border-b border-white/10">
                        <tr>
                            {['Status', 'Patient', 'Procedure', 'Diagnosis', 'Surgeon', 'Urgency', 'Action'].map((h) => (
                                <th key={h} className="text-left px-4 py-3 font-semibold text-[#caa26a] text-xs uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <Skeleton className="h-5 w-full bg-slate-100" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
