'use client';

/**
 * Doctor Consultations Page - Enhanced Premium Version
 * 
 * Consultation history and active sessions for the doctor.
 * 
 * ENHANCED: 
 * - Deep dark theme for professional focus
 * - Glassmorphism effects with backdrop-blur
 * - Framer-motion for silken-smooth staggered entry
 * - Interactive hover states and layout animations
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

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

    const { activeList, completedList, stats, groupedList } = useMemo(() => {
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

        // Apply filter & search
        let list: AppointmentResponseDto[];
        if (activeFilter === 'active') list = active;
        else if (activeFilter === 'completed') list = completed;
        else list = [...active, ...completed];

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

        const filteredActive = list.filter(c => c.status === AppointmentStatus.IN_CONSULTATION);
        if (filteredActive.length > 0) {
            groups.push({ label: 'Active Sessions', items: filteredActive });
        }

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
            groupedList: groups,
        };
    }, [consultations, activeFilter, searchQuery]);

    // ── Auth guard ────────────────────────────────────────────────────────

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 text-indigo-500 mx-auto animate-spin" />
                    <p className="text-sm text-slate-500 font-medium tracking-wide">Authenticating Clinical Session...</p>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <ClinicalDashboardShell className="bg-[#f8fafc] text-slate-900 min-h-screen selection:bg-indigo-500/10">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

                {/* ─── Header ──────────────────────────────────────────── */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Clinical Operations</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Consultation Room
                        </h1>
                        <p className="text-sm text-slate-500 font-medium italic">
                            Orchestrating patient outcomes through clinical excellence
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-full gap-2 px-4 h-9 transition-all"
                        onClick={() => loadConsultations(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Refresh Registry
                    </Button>
                </header>

                {/* ─── Ready State Banner ──────────── */}
                {!loading && activeList.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm group"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
                            <Stethoscope className="h-48 w-48 text-indigo-900 rotate-12" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
                                <CheckCircle className="h-8 w-8 text-emerald-600" />
                            </div>
                            <div className="text-center md:text-left space-y-1">
                                <h2 className="text-xl font-black text-slate-900">
                                    Queue Clear • Ready for Admission
                                </h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                                    No active consultations detected. Initialize a clinical session by admitting a checked-in patient from the scheduling board.
                                </p>
                            </div>
                            <Link href="/doctor/appointments" className="md:ml-auto w-full md:w-auto">
                                <Button size="lg" className="w-full md:w-auto gap-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-[20px] font-bold px-8 h-14 shadow-md transition-all active:scale-[0.98]">
                                    <Calendar className="h-4 w-4" />
                                    Launch Scheduler
                                    <ArrowRight className="h-4 w-4 opacity-50" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* ─── Stats Matrix ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Volume', value: stats.total, color: 'text-slate-900', bg: 'bg-white', icon: FileText, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
                        { label: 'Active Sessions', value: stats.active, color: 'text-indigo-600', bg: 'bg-white', icon: Activity, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-white', icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                        { label: 'Average Velocity', value: `${stats.avgDuration}m`, color: 'text-sky-600', bg: 'bg-white', icon: Timer, iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -4, boxShadow: '0 12px 20px -10px rgba(0,0,0,0.1)' }}
                            className={cn(
                                "relative flex flex-col justify-between p-6 rounded-[24px] border border-slate-200 transition-all duration-300 shadow-sm",
                                stat.bg
                            )}
                        >
                            <div>
                                <div className={cn("text-3xl font-black tracking-tighter", stat.color)}>
                                    {loading ? <Skeleton className="h-8 w-12" /> : stat.value}
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ─── Control Deck ────────────────────────────── */}
                <div className="sticky top-4 z-30 flex flex-col sm:flex-row sm:items-center gap-4 bg-white/80 backdrop-blur-xl p-3 rounded-[24px] border border-slate-200 shadow-sm">
                    {/* Filter Segment */}
                    <div className="flex bg-slate-100 rounded-[14px] p-1 gap-1 border border-slate-200/50">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={cn(
                                    "relative px-5 py-2 rounded-[10px] text-[11px] font-bold tracking-wide transition-all flex items-center gap-2 overflow-hidden group",
                                    activeFilter === tab.key
                                        ? "text-white"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {activeFilter === tab.key && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-indigo-600"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <tab.icon className={cn("h-3.5 w-3.5 relative z-10", activeFilter === tab.key && "text-white")} />
                                <span className="relative z-10 uppercase">{tab.label}</span>
                                <span className={cn(
                                    "relative z-10 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px]",
                                    activeFilter === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-400 border border-slate-200 shadow-sm"
                                )}>
                                    {loading ? '·' : (tab.key === 'all' ? consultations.length : tab.key === 'active' ? activeList.length : completedList.length)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                            placeholder="Patient name, procedure type, or record ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 text-sm bg-white border-slate-200 rounded-[16px] placeholder:text-slate-400 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* ─── Registry List ───────────────────────────────── */}
                <div className="px-1">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-20 w-full rounded-[20px] bg-white border border-slate-200 animate-pulse" />
                            ))}
                        </div>
                    ) : groupedList.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={activeFilter + searchQuery}
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-8"
                            >
                                {groupedList.map((group) => (
                                    <div key={group.label} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap opacity-60">
                                                {group.label}
                                            </h3>
                                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                                            <span className="text-[10px] text-slate-500 font-black tracking-tighter">
                                                {String(group.items.length).padStart(2, '0')} RECS
                                            </span>
                                        </div>

                                        <div className="grid gap-2">
                                            {group.items.map((consultation) => (
                                                <motion.div key={consultation.id} variants={itemVariants}>
                                                    <ConsultationRow consultation={consultation} />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm"
                        >
                            <div className="h-20 w-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                {searchQuery ? 'Zero Result Match' : 'Registry Empty'}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-xs text-center mt-2 font-medium leading-relaxed italic opacity-60">
                                {searchQuery
                                    ? 'The search parameters provided do not match any existing clinical records. Adjust your parameters.'
                                    : 'Clinical history is currently offline. Admission logs will synchronize once consultation sessions initiated.'
                                }
                            </p>
                            <Link href="/doctor/appointments" className="mt-8">
                                <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-full text-xs font-bold uppercase tracking-wider px-8 h-10 transition-all shadow-sm">
                                    <Calendar className="h-3.5 w-3.5 mr-2" />
                                    Launch Scheduler
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>
        </ClinicalDashboardShell>
    );
}

// ============================================================================
// CONSULTATION ROW — Premium interactive entry
// ============================================================================

function ConsultationRow({
    consultation,
}: {
    consultation: AppointmentResponseDto;
}) {
    const router = useRouter();
    const isActive = consultation.status === AppointmentStatus.IN_CONSULTATION;

    const patientName = consultation.patient
        ? `${consultation.patient.firstName} ${consultation.patient.lastName}`
        : 'Confidential Patient';
    const patientInitials = consultation.patient
        ? `${consultation.patient.firstName?.[0] || ''}${consultation.patient.lastName?.[0] || ''}`.toUpperCase()
        : '?';

    const duration = consultation.consultationDuration;
    const durationLabel = duration
        ? duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`
        : null;

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

    const runningDuration = useMemo(() => {
        if (!isActive || !consultation.consultationStartedAt) return null;
        const started = new Date(consultation.consultationStartedAt);
        const mins = Math.round((Date.now() - started.getTime()) / 60000);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    }, [isActive, consultation.consultationStartedAt]);

    const notesPreview = consultation.note
        ? consultation.note.length > 50 ? consultation.note.substring(0, 50) + '…' : consultation.note
        : null;

    const handleClick = () => {
        if (isActive) {
            router.push(`/doctor/consultations/${consultation.id}/session`);
        } else {
            router.push(`/doctor/appointments/${consultation.id}`);
        }
    };

    return (
        <motion.div
            whileHover={{ scale: 1.002, x: 2, backgroundColor: 'rgba(255,255,255,0.8)' }}
            whileTap={{ scale: 0.998 }}
            className={cn(
                "group relative flex items-center gap-6 p-4 rounded-[20px] bg-white border border-slate-200 transition-all cursor-pointer shadow-sm",
                isActive && "border-indigo-200 ring-1 ring-indigo-50 bg-indigo-50/10 shadow-md"
            )}
            onClick={handleClick}
        >
            {/* Left Accents */}
            <div className={cn(
                "absolute inset-y-4 left-0 w-1 rounded-full transition-all group-hover:inset-y-3 shadow-sm",
                isActive ? "bg-indigo-500" : "bg-slate-200 group-hover:bg-slate-300"
            )} />

            {/* Time / Period */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 px-2 border-r border-slate-100 select-none">
                <p className="text-base font-black text-slate-900 leading-none tracking-tighter">{consultation.time}</p>
                <div className="flex items-center gap-1.5 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Calendar className="h-2.5 w-2.5" />
                    <p className="text-[9px] font-black uppercase tracking-tighter">
                        {isToday(new Date(consultation.appointmentDate)) ? 'TDY' : format(new Date(consultation.appointmentDate), 'MMM d')}
                    </p>
                </div>
            </div>

            {/* Profile Avatar */}
            <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12 rounded-2xl border border-slate-100 group-hover:border-indigo-200 transition-all shadow-sm">
                    <AvatarImage src={consultation.patient?.img ?? undefined} alt={patientName} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-slate-50 text-slate-400 text-sm font-black border border-slate-100">
                        {patientInitials}
                    </AvatarFallback>
                </Avatar>
                {isActive && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm"
                    />
                )}
            </div>

            {/* Identification & Intel */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <p className="text-base font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {patientName}
                    </p>
                    {isActive && (
                        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-bold uppercase text-indigo-600">
                            Live Session
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100/50">
                        <Stethoscope className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{consultation.type}</span>
                    </div>
                    {notesPreview && !isActive && (
                        <span className="text-xs text-slate-400 truncate italic opacity-70 group-hover:opacity-100 transition-opacity">
                            {notesPreview}
                        </span>
                    )}
                </div>
            </div>

            {/* Metrics */}
            {(durationLabel || runningDuration) && (
                <div className={cn(
                    "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border select-none transition-all",
                    isActive
                        ? isOverdue
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <Timer className="h-3.5 w-3.5" />
                    {isActive ? runningDuration : durationLabel}
                </div>
            )}

            {/* Status / Global Warning */}
            {isOverdue && (
                <div className="p-2 bg-amber-50 rounded-full animate-pulse shadow-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
            )}

            {/* Execution / Terminal Action */}
            <div className="flex-shrink-0 px-2" onClick={(e) => e.stopPropagation()}>
                {isActive ? (
                    <Button
                        size="sm"
                        className={cn(
                            "h-9 px-6 text-[11px] font-black uppercase rounded-[12px] gap-2 transition-all shadow-sm active:scale-95",
                            isOverdue
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        )}
                        onClick={() => router.push(`/doctor/consultations/${consultation.id}/session`)}
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Enter Session
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        onClick={() => router.push(`/doctor/appointments/${consultation.id}`)}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
