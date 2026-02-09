'use client';

/**
 * Doctor Appointments Page
 * 
 * Central appointment management view for doctors. Shows all appointments
 * across Today / Upcoming / Past with status filtering, search,
 * and contextual workflow actions.
 * 
 * Data fetching includes all active statuses so doctors can see:
 * - Pending confirmations they need to act on
 * - Scheduled appointments awaiting patient arrival
 * - Checked-in patients ready for consultation
 * - In-progress consultations
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Calendar,
    Clock,
    CheckCircle,
    CalendarDays,
    Search,
    Stethoscope,
    AlertTriangle,
    Play,
    FileText,
    ChevronRight,
    ArrowRight,
    RefreshCw,
    User,
    Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format, isToday, isPast, isFuture, startOfDay } from 'date-fns';
import { CompleteConsultationDialog } from '@/components/doctor/CompleteConsultationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; sortOrder: number }> = {
    IN_CONSULTATION: { label: 'In Consult', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500', sortOrder: 0 },
    CHECKED_IN: { label: 'Checked In', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', sortOrder: 1 },
    READY_FOR_CONSULTATION: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', sortOrder: 2 },
    PENDING_DOCTOR_CONFIRMATION: { label: 'Needs Confirm', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400', sortOrder: 3 },
    SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400', sortOrder: 4 },
    CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400', sortOrder: 5 },
    COMPLETED: { label: 'Completed', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300', sortOrder: 6 },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400', sortOrder: 7 },
    NO_SHOW: { label: 'No Show', color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400', sortOrder: 8 },
    PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400', sortOrder: 9 },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300', sortOrder: 99 };
}

// All active statuses to fetch (non-terminal)
const ALL_ACTIVE_STATUSES = [
    AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.READY_FOR_CONSULTATION,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.COMPLETED,
].join(',');

// Tab definitions
type TabKey = 'today' | 'upcoming' | 'past';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
];

// Status filter chips available per tab
const STATUS_FILTERS = [
    { value: 'ALL', label: 'All' },
    { value: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION, label: 'Needs Confirm' },
    { value: AppointmentStatus.SCHEDULED, label: 'Scheduled' },
    { value: AppointmentStatus.CHECKED_IN, label: 'Checked In' },
    { value: AppointmentStatus.IN_CONSULTATION, label: 'In Consult' },
    { value: AppointmentStatus.COMPLETED, label: 'Completed' },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
    const [showCompleteConsultation, setShowCompleteConsultation] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('today');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isAuthenticated && user) {
            loadAppointments();
        }
    }, [isAuthenticated, user]);

    const loadAppointments = useCallback(async (silent = false) => {
        if (!user) return;
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);

            const response = await doctorApi.getAppointments(user.id, ALL_ACTIVE_STATUSES, true);

            if (response.success && response.data) {
                setAppointments(response.data);
            } else if (!response.success) {
                if (!silent) toast.error(response.error || 'Failed to load appointments');
            }
        } catch (error) {
            if (!silent) toast.error('An error occurred while loading appointments');
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const handleCheckIn = async (appointmentId: number) => {
        if (!user) return;
        try {
            const response = await doctorApi.checkInPatient(appointmentId, user.id);
            if (response.success) {
                toast.success('Patient checked in successfully');
                loadAppointments(true);
            } else {
                toast.error(response.error || 'Failed to check in patient');
            }
        } catch (error) {
            toast.error('An error occurred while checking in');
        }
    };

    const handleStartConsultation = (appointment: AppointmentResponseDto) => {
        // Navigate to the consultation session page — the session page
        // owns the "start consultation" workflow (shows dialog, calls API).
        router.push(`/doctor/consultations/${appointment.id}/session`);
    };

    const handleCompleteConsultation = (appointment: AppointmentResponseDto) => {
        setSelectedAppointment(appointment);
        setShowCompleteConsultation(true);
    };

    const handleConsultationSuccess = () => {
        setShowCompleteConsultation(false);
        setSelectedAppointment(null);
        loadAppointments(true);
    };

    // ── Filtering & Sorting ──────────────────────────────────────────────

    const { todayList, upcomingList, pastList, stats } = useMemo(() => {
        const today = startOfDay(new Date());

        const todayList: AppointmentResponseDto[] = [];
        const upcomingList: AppointmentResponseDto[] = [];
        const pastList: AppointmentResponseDto[] = [];

        for (const apt of appointments) {
            const aptDate = startOfDay(new Date(apt.appointmentDate));
            if (isToday(aptDate)) {
                todayList.push(apt);
            } else if (aptDate > today) {
                upcomingList.push(apt);
            } else {
                pastList.push(apt);
            }
        }

        // Sort by priority: in-consultation first, then checked-in, then by time
        const sortByPriority = (a: AppointmentResponseDto, b: AppointmentResponseDto) => {
            const orderA = getStatusConfig(a.status).sortOrder;
            const orderB = getStatusConfig(b.status).sortOrder;
            if (orderA !== orderB) return orderA - orderB;
            return (a.time || '').localeCompare(b.time || '');
        };

        todayList.sort(sortByPriority);
        upcomingList.sort((a, b) => {
            const dateA = new Date(a.appointmentDate).getTime();
            const dateB = new Date(b.appointmentDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.time || '').localeCompare(b.time || '');
        });
        pastList.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

        // Stats
        const needsAction = todayList.filter(
            (a) => a.status === AppointmentStatus.CHECKED_IN ||
                a.status === AppointmentStatus.READY_FOR_CONSULTATION ||
                a.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
        ).length;
        const inProgress = todayList.filter((a) => a.status === AppointmentStatus.IN_CONSULTATION).length;
        const completed = todayList.filter((a) => a.status === AppointmentStatus.COMPLETED).length;

        return {
            todayList,
            upcomingList,
            pastList,
            stats: {
                total: todayList.length,
                needsAction,
                inProgress,
                completed,
                upcoming: upcomingList.length,
            },
        };
    }, [appointments]);

    const activeList = activeTab === 'today' ? todayList : activeTab === 'upcoming' ? upcomingList : pastList;

    const filteredList = useMemo(() => {
        let list = activeList;

        // Status filter
        if (statusFilter !== 'ALL') {
            list = list.filter((apt) => apt.status === statusFilter);
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((apt) => {
                const patientName = apt.patient
                    ? `${apt.patient.firstName} ${apt.patient.lastName}`.toLowerCase()
                    : '';
                const type = (apt.type || '').toLowerCase();
                return patientName.includes(q) || type.includes(q) || apt.time?.includes(q);
            });
        }

        return list;
    }, [activeList, statusFilter, searchQuery]);

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
                            Appointments
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 gap-1.5 self-start sm:self-auto"
                        onClick={() => loadAppointments(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                {/* ─── Stats Strip ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Today', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
                        { label: 'Needs Action', value: stats.needsAction, color: 'text-orange-700', bg: 'bg-orange-50' },
                        { label: 'In Progress', value: stats.inProgress, color: 'text-violet-700', bg: 'bg-violet-50' },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Upcoming', value: stats.upcoming, color: 'text-blue-700', bg: 'bg-blue-50' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={cn(
                                "px-4 py-3 rounded-xl border border-slate-100 text-center",
                                stat.bg
                            )}
                        >
                            <p className={cn("text-xl font-bold leading-none", stat.color)}>
                                {loading ? '–' : stat.value}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* ─── Tab Bar + Search ────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Tabs */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                        {TABS.map((tab) => {
                            const count = tab.key === 'today' ? todayList.length
                                : tab.key === 'upcoming' ? upcomingList.length
                                    : pastList.length;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); setStatusFilter('ALL'); }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                                        activeTab === tab.key
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {tab.label}
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                        activeTab === tab.key ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
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
                            placeholder="Search patient or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg"
                        />
                    </div>
                </div>

                {/* ─── Status Filter Chips ─────────────────────────────── */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    {STATUS_FILTERS.map((sf) => {
                        const count = sf.value === 'ALL'
                            ? activeList.length
                            : activeList.filter((a) => a.status === sf.value).length;
                        if (sf.value !== 'ALL' && count === 0) return null;
                        return (
                            <button
                                key={sf.value}
                                onClick={() => setStatusFilter(sf.value)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                                    statusFilter === sf.value
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                {sf.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* ─── Appointment List ────────────────────────────────── */}
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
                ) : filteredList.length > 0 ? (
                    <div className="space-y-2">
                        {filteredList.map((appointment) => (
                            <AppointmentRow
                                key={appointment.id}
                                appointment={appointment}
                                onCheckIn={handleCheckIn}
                                onStartConsultation={handleStartConsultation}
                                onCompleteConsultation={handleCompleteConsultation}
                                showDate={activeTab !== 'today'}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                        <Calendar className="h-8 w-8 text-slate-300 mb-3" />
                        <h3 className="text-sm font-semibold text-slate-700">
                            {searchQuery ? 'No matching appointments' : `No ${activeTab} appointments`}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
                            {searchQuery
                                ? 'Try adjusting your search or filter criteria.'
                                : activeTab === 'today'
                                    ? 'Your schedule is clear for today.'
                                    : activeTab === 'upcoming'
                                        ? 'No upcoming appointments scheduled.'
                                        : 'No past appointments found.'
                            }
                        </p>
                    </div>
                )}

                {/* Complete Consultation Dialog */}
                {showCompleteConsultation && selectedAppointment && (
                    <CompleteConsultationDialog
                        open={showCompleteConsultation}
                        onClose={() => {
                            setShowCompleteConsultation(false);
                            setSelectedAppointment(null);
                        }}
                        onSuccess={handleConsultationSuccess}
                        appointment={selectedAppointment}
                        doctorId={user.id}
                    />
                )}
            </div>
        </ClinicalDashboardShell>
    );
}

// ============================================================================
// APPOINTMENT ROW — Compact inline card
// ============================================================================

function AppointmentRow({
    appointment,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
    showDate = false,
}: {
    appointment: AppointmentResponseDto;
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
    showDate?: boolean;
}) {
    const router = useRouter();
    const statusCfg = getStatusConfig(appointment.status);

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Patient';
    const patientInitials = appointment.patient
        ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
        : 'P';

    const canStart =
        appointment.status === AppointmentStatus.CHECKED_IN ||
        appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
    const isInConsult = appointment.status === AppointmentStatus.IN_CONSULTATION;
    const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
    const needsConfirm = appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;

    // Time-aware overdue detection
    const isOverdue = useMemo(() => {
        if (!isInConsult) return false;
        const now = new Date();
        const aptDate = new Date(appointment.appointmentDate);
        if (!isToday(aptDate) || !appointment.time) return false;
        const [h, m] = appointment.time.split(':').map(Number);
        const end = new Date(aptDate);
        end.setHours(h, m + 30, 0, 0);
        return now > end;
    }, [appointment, isInConsult]);

    // Border highlight for action items
    const borderColor = isInConsult
        ? (isOverdue ? 'border-l-amber-500' : 'border-l-violet-500')
        : canStart
            ? 'border-l-emerald-500'
            : needsConfirm
                ? 'border-l-orange-400'
                : 'border-l-transparent';

    return (
        <div
            className={cn(
                "group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer border-l-[3px]",
                borderColor
            )}
            onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
        >
            {/* Time Block */}
            <div className="flex-shrink-0 text-center w-14">
                <p className="text-sm font-bold text-slate-900 leading-none">{appointment.time}</p>
                {showDate && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(appointment.appointmentDate), 'MMM d')}
                    </p>
                )}
            </div>

            {/* Status Dot */}
            <div className={cn("w-1.5 h-8 rounded-full flex-shrink-0", statusCfg.dot)} />

            {/* Patient Avatar */}
            <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                <AvatarImage src={appointment.patient?.img ?? undefined} alt={patientName} />
                <AvatarFallback className="rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                    {patientInitials}
                </AvatarFallback>
            </Avatar>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{patientName}</p>
                <p className="text-[11px] text-slate-400 truncate">{appointment.type}</p>
            </div>

            {/* Status Badge */}
            <Badge
                variant="outline"
                className={cn("text-[10px] font-semibold flex-shrink-0 px-2 py-0.5 border", statusCfg.bg, statusCfg.color)}
            >
                {statusCfg.label}
            </Badge>

            {/* Overdue indicator */}
            {isOverdue && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}

            {/* Quick Action */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {isInConsult && (
                    <Button
                        size="sm"
                        className={cn(
                            "h-7 px-3 text-[11px] font-semibold rounded-lg gap-1",
                            isOverdue
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-violet-600 hover:bg-violet-700 text-white"
                        )}
                        onClick={() => router.push(`/doctor/consultations/${appointment.id}/session`)}
                    >
                        <Play className="h-3 w-3" />
                        Continue
                    </Button>
                )}
                {canStart && (
                    <Button
                        size="sm"
                        className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => onStartConsultation(appointment)}
                    >
                        <Stethoscope className="h-3 w-3" />
                        Start
                    </Button>
                )}
                {needsConfirm && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-[11px] font-semibold rounded-lg border-orange-300 text-orange-700 hover:bg-orange-50 gap-1"
                        onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
                    >
                        Review
                    </Button>
                )}
                {isCompleted && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-600"
                        onClick={() => router.push(`/doctor/consultations/${appointment.id}/session`)}
                    >
                        <FileText className="h-3 w-3" />
                    </Button>
                )}
                {!isInConsult && !canStart && !needsConfirm && !isCompleted && (
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                )}
            </div>
        </div>
    );
}
