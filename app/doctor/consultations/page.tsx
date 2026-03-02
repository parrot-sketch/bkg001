'use client';

/**
 * Doctor Consultations Page
 * 
 * Clean, professional interface for viewing consultation history.
 * Typography follows landing page V1 style guide.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    Calendar,
    Clock,
    Search,
    CheckCircle,
    RefreshCw,
    ChevronRight,
    Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSULTATION_STATUSES = [
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.COMPLETED,
].join(',');

type FilterKey = 'all' | 'active' | 'completed';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
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
                true
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

    // Derived data
    const { activeList, completedList, stats, groupedList } = useMemo(() => {
        const active = consultations.filter(
            (c) => c.status === AppointmentStatus.IN_CONSULTATION
        );
        const completed = consultations.filter(
            (c) => c.status === AppointmentStatus.COMPLETED
        );

        active.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        completed.sort((a, b) =>
            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        );

        const totalDuration = completed.reduce((sum, c) => sum + (c.consultationDuration || 0), 0);
        const avgDuration = completed.length > 0 ? Math.round(totalDuration / completed.length) : 0;

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
                return patientName.includes(q) || (c.type || '').toLowerCase().includes(q);
            });
        }

        const groups: { label: string; items: AppointmentResponseDto[] }[] = [];

        const filteredActive = list.filter(c => c.status === AppointmentStatus.IN_CONSULTATION);
        if (filteredActive.length > 0) {
            groups.push({ label: 'Active', items: filteredActive });
        }

        const completedInList = list.filter((c) => c.status === AppointmentStatus.COMPLETED);
        if (completedInList.length > 0) {
            const today: AppointmentResponseDto[] = [];
            const yesterday: AppointmentResponseDto[] = [];
            const older: AppointmentResponseDto[] = [];

            const now = new Date();
            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);

            for (const c of completedInList) {
                const d = new Date(c.appointmentDate);
                if (d.toDateString() === now.toDateString()) {
                    today.push(c);
                } else if (d.toDateString() === yesterdayDate.toDateString()) {
                    yesterday.push(c);
                } else {
                    older.push(c);
                }
            }

            if (today.length > 0) groups.push({ label: 'Today', items: today });
            if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
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

    // Auth guard
    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <RefreshCw className="h-6 w-6 text-slate-400 mx-auto animate-spin" />
                    <p className="text-sm text-slate-500 mt-2">Loading...</p>
                </div>
            </div>
        );
    }

    // Render
    return (
        <ClinicalDashboardShell className="bg-white text-slate-900 min-h-screen">
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Consultations
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            View and manage consultation history
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadConsultations(true)}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: stats.total, icon: FileText },
                        { label: 'Active', value: stats.active, icon: Activity },
                        { label: 'Completed', value: stats.completed, icon: CheckCircle },
                        { label: 'Avg Duration', value: `${stats.avgDuration}m`, icon: Clock },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="border rounded-lg bg-white p-4"
                        >
                            <div className="flex items-center gap-3">
                                <stat.icon className="h-5 w-5 text-slate-500" />
                                <div>
                                    <div className="text-xl font-semibold text-slate-900">
                                        {loading ? '-' : stat.value}
                                    </div>
                                    <div className="text-sm text-slate-500">{stat.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    activeFilter === tab.key
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search consultations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* List */}
                <div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-16 border rounded-lg bg-slate-50 animate-pulse" />
                            ))}
                        </div>
                    ) : groupedList.length > 0 ? (
                        <div className="space-y-6">
                            {groupedList.map((group) => (
                                <div key={group.label}>
                                    <h3 className="text-sm font-medium text-slate-500 mb-3">
                                        {group.label}
                                    </h3>
                                    <div className="space-y-2">
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
                        <div className="text-center py-12 border rounded-lg bg-slate-50">
                            <p className="text-sm text-slate-500">
                                {searchQuery ? 'No consultations found.' : 'No consultations yet.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </ClinicalDashboardShell>
    );
}

// ============================================================================
// CONSULTATION ROW
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
        : 'Unknown Patient';

    const initials = patientName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleClick = () => {
        if (isActive) {
            router.push(`/doctor/consultations/${consultation.id}/session`);
        } else {
            router.push(`/doctor/appointments/${consultation.id}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "flex items-center justify-between p-4 border rounded-lg bg-white cursor-pointer hover:bg-slate-50 transition-colors",
                isActive && "border-blue-300 bg-blue-50/50"
            )}
        >
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
                    {initials}
                </div>
                <div>
                    <div className="text-sm font-medium text-slate-900">{patientName}</div>
                    <div className="text-xs text-slate-500">
                        {consultation.type} • {consultation.time}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                )}>
                    {consultation.status}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
        </div>
    );
}
