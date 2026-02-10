'use client';

/**
 * Doctor Consultations Page
 * 
 * Consultation history and active sessions for the doctor.
 * 
 * A "Consultation" is the clinical session that occurs when a doctor sees a patient.
 * In the DB, the Consultation record (1:1 with Appointment) is created when the doctor
 * starts the consultation from a checked-in appointment.
 * 
 * This page shows:
 * - Active consultations (IN_CONSULTATION) with "Continue" action
 * - Completed consultations with outcome, duration, notes preview
 * - Filtering by state, search, date grouping
 * 
 * Data source: Appointments with status IN_CONSULTATION or COMPLETED,
 * which have consultation tracking fields (started_at, ended_at, duration).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    FileText,
    Calendar,
    Clock,
    Play,
    Search,
    Stethoscope,
    CheckCircle,
    ArrowRight,
    Timer,
    RefreshCw,
    Filter,
    User,
    ChevronRight,
    AlertTriangle,
    Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSULTATION_STATUSES = [
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.COMPLETED,
].join(',');

type FilterKey = 'all' | 'active' | 'completed';

const FILTER_TABS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'active', label: 'Active', icon: Activity },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function DoctorConsultationsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [consultations, setConsultations] = useState<AppointmentResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isAuthenticated && user) {
            loadConsultations();
        }
    }, [isAuthenticated, user]);

    const loadConsultations = useCallback(async (silent = false) => {
        if (!user) return;
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);

            const response = await doctorApi.getAppointments(
                user.id,
                CONSULTATION_STATUSES,
                true // include all dates
            );

            if (response.success && response.data) {
                setConsultations(response.data);
            } else if (!response.success) {
                if (!silent) toast.error(response.error || 'Failed to load consultations');
            }
        } catch (error) {
            if (!silent) toast.error('An error occurred while loading consultations');
            console.error('Error loading consultations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    // ── Derived data ─────────────────────────────────────────────────────

    const { activeList, completedList, stats, filteredList, groupedList } = useMemo(() => {
        const active = consultations.filter(
            (c) => c.status === AppointmentStatus.IN_CONSULTATION
        );
        const completed = consultations.filter(
            (c) => c.status === AppointmentStatus.COMPLETED
        );

        // Sort: active by time (earliest first), completed by date (most recent first)
        active.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        completed.sort((a, b) =>
            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        );

        const totalDuration = completed.reduce((sum, c) => sum + (c.consultationDuration || 0), 0);
        const avgDuration = completed.length > 0 ? Math.round(totalDuration / completed.length) : 0;

        // Apply filter
        let list: AppointmentResponseDto[];
        if (activeFilter === 'active') list = active;
        else if (activeFilter === 'completed') list = completed;
        else list = [...active, ...completed];

        // Apply search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((c) => {
                const patientName = c.patient
                    ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase()
                    : '';
                return patientName.includes(q) || (c.type || '').toLowerCase().includes(q) || c.note?.toLowerCase().includes(q);
            });
        }

        // Group by date bucket for completed
        const groups: { label: string; items: AppointmentResponseDto[] }[] = [];
        if (activeFilter !== 'completed' && active.length > 0) {
            groups.push({ label: 'Active Sessions', items: active });
        }

        // Group completed by time period
        const completedInList = list.filter((c) => c.status === AppointmentStatus.COMPLETED);
        if (completedInList.length > 0) {
            const today: AppointmentResponseDto[] = [];
            const yesterday: AppointmentResponseDto[] = [];
            const thisWeek: AppointmentResponseDto[] = [];
            const thisMonth: AppointmentResponseDto[] = [];
            const older: AppointmentResponseDto[] = [];

            for (const c of completedInList) {
                const d = new Date(c.appointmentDate);
                if (isToday(d)) today.push(c);
                else if (isYesterday(d)) yesterday.push(c);
                else if (isThisWeek(d)) thisWeek.push(c);
                else if (isThisMonth(d)) thisMonth.push(c);
                else older.push(c);
            }

            if (today.length > 0) groups.push({ label: 'Today', items: today });
            if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
            if (thisWeek.length > 0) groups.push({ label: 'This Week', items: thisWeek });
            if (thisMonth.length > 0) groups.push({ label: 'This Month', items: thisMonth });
            if (older.length > 0) groups.push({ label: 'Earlier', items: older });
        }

        return {
            activeList: active,
            completedList: completed,
            stats: {
                total: consultations.length,
                active: active.length,
                completed: completed.length,
                avgDuration,
            },
            filteredList: list,
            groupedList: groups,
        };
    }, [consultations, activeFilter, searchQuery]);

    // ── Auth guard ────────────────────────────────────────────────────────

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center space-y-3">
                    <div className="h-10 w-10 bg-slate-200 rounded-full mx-auto animate-pulse" />
                    <p className="text-sm text-slate-400">Authenticating...</p>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <ClinicalDashboardShell>
            <div className="space-y-5 animate-in fade-in duration-500 pb-8">

                {/* ─── Header ──────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Consultation Room
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Active sessions & consultation history
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 gap-1.5 self-start sm:self-auto"
                        onClick={() => loadConsultations(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                {/* ─── Ready State Banner (no active sessions) ──────────── */}
                {!loading && activeList.length === 0 && (
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <Stethoscope className="h-28 w-28" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Consultation Room — Ready
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    No active sessions. Start a consultation from the appointments page when a patient is checked in.
                                </p>
                            </div>
                            <Link href="/doctor/appointments" className="ml-auto shrink-0">
                                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Calendar className="h-3.5 w-3.5" />
                                    View Appointments
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* ─── Stats Strip ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Sessions', value: stats.total, color: 'text-slate-900', bg: 'bg-white', icon: FileText },
                        { label: 'Active Now', value: stats.active, color: 'text-violet-700', bg: 'bg-violet-50', icon: Activity },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
                        { label: 'Avg Duration', value: `${stats.avgDuration}m`, color: 'text-blue-700', bg: 'bg-blue-50', icon: Timer },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100",
                                stat.bg
                            )}
                        >
                            <stat.icon className={cn("h-4 w-4 flex-shrink-0", stat.color)} />
                            <div>
                                <p className={cn("text-lg font-bold leading-none", stat.color)}>
                                    {loading ? '–' : stat.value}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─── Filter Bar + Search ────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Filter Tabs */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                        {FILTER_TABS.map((tab) => {
                            const count = tab.key === 'all' ? consultations.length
                                : tab.key === 'active' ? activeList.length
                                    : completedList.length;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveFilter(tab.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                                        activeFilter === tab.key
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <tab.icon className="h-3 w-3" />
                                    {tab.label}
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                        activeFilter === tab.key ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                                    )}>
                                        {loading ? '–' : count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search patient, type, or notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg"
                        />
                    </div>
                </div>

                {/* ─── Consultation List ───────────────────────────────── */}
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : groupedList.length > 0 ? (
                    <div className="space-y-5">
                        {groupedList.map((group) => (
                            <div key={group.label}>
                                {/* Group Header */}
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {group.label}
                                    </h3>
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {group.items.length}
                                    </span>
                                </div>

                                {/* Items */}
                                <div className="space-y-1.5">
                                    {group.items.map((consultation) => (
                                        <ConsultationRow
                                            key={consultation.id}
                                            consultation={consultation}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                        <Stethoscope className="h-8 w-8 text-slate-300 mb-3" />
                        <h3 className="text-sm font-semibold text-slate-700">
                            {searchQuery ? 'No matching consultations' : 'No consultations yet'}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
                            {searchQuery
                                ? 'Try adjusting your search criteria.'
                                : 'Consultations appear here when you start seeing patients. Check in a patient from the appointments page to begin.'
                            }
                        </p>
                        <Link href="/doctor/appointments" className="mt-4">
                            <Button size="sm" variant="outline" className="text-xs gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Go to Appointments
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </ClinicalDashboardShell>
    );
}

// ============================================================================
// CONSULTATION ROW — Compact inline card
// ============================================================================

function ConsultationRow({
    consultation,
}: {
    consultation: AppointmentResponseDto;
}) {
    const router = useRouter();
    const isActive = consultation.status === AppointmentStatus.IN_CONSULTATION;
    const isCompleted = consultation.status === AppointmentStatus.COMPLETED;

    const patientName = consultation.patient
        ? `${consultation.patient.firstName} ${consultation.patient.lastName}`
        : 'Patient';
    const patientInitials = consultation.patient
        ? `${consultation.patient.firstName?.[0] || ''}${consultation.patient.lastName?.[0] || ''}`.toUpperCase()
        : 'P';

    const duration = consultation.consultationDuration;
    const durationLabel = duration
        ? duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`
        : null;

    // Time-aware: check if active consultation is overdue
    const isOverdue = useMemo(() => {
        if (!isActive) return false;
        const now = new Date();
        const aptDate = new Date(consultation.appointmentDate);
        if (!isToday(aptDate) || !consultation.time) return false;
        const [h, m] = consultation.time.split(':').map(Number);
        const end = new Date(aptDate);
        end.setHours(h, m + 30, 0, 0);
        return now > end;
    }, [consultation, isActive]);

    // Running duration for active
    const runningDuration = useMemo(() => {
        if (!isActive || !consultation.consultationStartedAt) return null;
        const started = new Date(consultation.consultationStartedAt);
        const mins = Math.round((Date.now() - started.getTime()) / 60000);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    }, [isActive, consultation.consultationStartedAt]);

    // Notes preview
    const notesPreview = consultation.note
        ? consultation.note.length > 80 ? consultation.note.substring(0, 80) + '…' : consultation.note
        : null;

    const handleClick = () => {
        if (isActive) {
            router.push(`/doctor/consultations/${consultation.id}/session`);
        } else {
            router.push(`/doctor/appointments/${consultation.id}`);
        }
    };

    return (
        <div
            className={cn(
                "group flex items-center gap-3 p-3 rounded-xl bg-white border transition-all cursor-pointer",
                isActive
                    ? "border-violet-200 hover:border-violet-300 hover:shadow-sm border-l-[3px] border-l-violet-500"
                    : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
            )}
            onClick={handleClick}
        >
            {/* Time */}
            <div className="flex-shrink-0 text-center w-14">
                <p className="text-sm font-bold text-slate-900 leading-none">{consultation.time}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                    {isToday(new Date(consultation.appointmentDate))
                        ? 'Today'
                        : format(new Date(consultation.appointmentDate), 'MMM d')
                    }
                </p>
            </div>

            {/* Status Indicator */}
            <div className={cn(
                "w-1.5 h-8 rounded-full flex-shrink-0",
                isActive ? "bg-violet-500" : "bg-slate-300"
            )} />

            {/* Patient Avatar */}
            <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                <AvatarImage src={consultation.patient?.img ?? undefined} alt={patientName} />
                <AvatarFallback className="rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                    {patientInitials}
                </AvatarFallback>
            </Avatar>

            {/* Patient + Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                        {patientName}
                    </p>
                    {isActive && (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px] font-bold px-1.5 py-0 h-4 border">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-1 animate-pulse" />
                            Live
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 truncate">{consultation.type}</span>
                    {notesPreview && !isActive && (
                        <>
                            <span className="text-slate-200">·</span>
                            <span className="text-[11px] text-slate-400 truncate italic">{notesPreview}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Duration / Running Time */}
            {(durationLabel || runningDuration) && (
                <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium flex-shrink-0",
                    isActive
                        ? isOverdue
                            ? "bg-amber-50 text-amber-700"
                            : "bg-violet-50 text-violet-700"
                        : "bg-slate-50 text-slate-500"
                )}>
                    <Timer className="h-3 w-3" />
                    {isActive ? runningDuration : durationLabel}
                </div>
            )}

            {/* Overdue indicator */}
            {isOverdue && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}

            {/* Action */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {isActive ? (
                    <Button
                        size="sm"
                        className={cn(
                            "h-7 px-3 text-[11px] font-semibold rounded-lg gap-1",
                            isOverdue
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-violet-600 hover:bg-violet-700 text-white"
                        )}
                        onClick={() => router.push(`/doctor/consultations/${consultation.id}/session`)}
                    >
                        <Play className="h-3 w-3" />
                        Continue
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-600"
                        onClick={() => router.push(`/doctor/appointments/${consultation.id}`)}
                    >
                        <FileText className="h-3 w-3 mr-1" />
                        View
                    </Button>
                )}
            </div>
        </div>
    );
}
