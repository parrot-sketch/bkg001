'use client';

import { RefreshCw, Search, Eye, Calendar as CalendarIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format, isToday, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentKeys } from '@/hooks/useAppointments';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const ALL_ACTIVE_STATUSES = [
    AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.READY_FOR_CONSULTATION,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.COMPLETED,
].join(',');

type TabKey = 'today' | 'upcoming' | 'pending';
type StatusFilter = 'ALL' | AppointmentStatus;

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const {
        data: appointmentData,
        isLoading: loading,
        isRefetching: refreshing,
        refetch
    } = useDoctorAppointments(user?.id, ALL_ACTIVE_STATUSES, isAuthenticated && !!user);

    const appointments = appointmentData || [];

    const { todayAppointments, upcomingAppointments, pendingConfirmations, stats } = useMemo(() => {
        const today: AppointmentResponseDto[] = [];
        const upcoming: AppointmentResponseDto[] = [];
        const pending: AppointmentResponseDto[] = [];

        for (const apt of appointments) {
            const aptDate = new Date(apt.appointmentDate);
            if (apt.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
                pending.push(apt);
            } else if (isToday(aptDate)) {
                today.push(apt);
            } else if (aptDate > startOfDay(new Date())) {
                upcoming.push(apt);
            }
        }

        const sortByTime = (a: AppointmentResponseDto, b: AppointmentResponseDto) =>
            (a.time || '').localeCompare(b.time || '');

        return {
            todayAppointments: today.sort(sortByTime),
            upcomingAppointments: upcoming.sort((a, b) =>
                new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
            ),
            pendingConfirmations: pending.sort(sortByTime),
            stats: {
                today: today.length,
                upcoming: upcoming.length,
                pending: pending.length,
            }
        };
    }, [appointments]);

    const initialTab: TabKey = pendingConfirmations.length > 0 ? 'pending' :
        (searchParams.get('tab') as TabKey) || 'today';
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    useEffect(() => {
        const interval = setInterval(() => refetch(), 60000);
        return () => clearInterval(interval);
    }, [refetch]);

    const handleConfirm = async (appointmentId: number) => {
        try {
            const response = await doctorApi.confirmAppointment(appointmentId, 'confirm');
            if (response.success) {
                toast.success('Appointment confirmed');
                queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
                refetch();
            } else {
                toast.error(response.error || 'Failed to confirm');
            }
        } catch {
            toast.error('Error confirming appointment');
        }
    };

    const handleReject = async (appointmentId: number) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;
        try {
            const response = await doctorApi.confirmAppointment(appointmentId, 'reject', { rejectionReason: reason });
            if (response.success) {
                toast.success('Appointment rejected');
                queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
                refetch();
            } else {
                toast.error(response.error || 'Failed to reject');
            }
        } catch {
            toast.error('Error rejecting appointment');
        }
    };

    const handleStartConsultation = (appointmentId: number) => {
        router.push(`/doctor/consultations/session/${appointmentId}`);
    };

    const currentList = activeTab === 'today' ? todayAppointments
        : activeTab === 'upcoming' ? upcomingAppointments
        : pendingConfirmations;

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    useEffect(() => {
        if (activeTab === 'pending') {
            setStatusFilter(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
        } else if (statusFilter === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
            setStatusFilter('ALL');
        }
        setSearchQuery('');
    }, [activeTab]);

    const filteredList = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return currentList.filter((apt) => {
            if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;
            if (!q) return true;
            const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : '';
            const fileNumber = apt.patient?.fileNumber ? String(apt.patient.fileNumber) : '';
            const type = apt.type ?? '';
            const note = apt.note ?? '';
            const date = apt.appointmentDate ? format(new Date(apt.appointmentDate), 'yyyy-MM-dd') : '';
            const time = apt.time ?? '';
            return (
                patientName.toLowerCase().includes(q) ||
                fileNumber.toLowerCase().includes(q) ||
                type.toLowerCase().includes(q) ||
                note.toLowerCase().includes(q) ||
                date.toLowerCase().includes(q) ||
                time.toLowerCase().includes(q)
            );
        });
    }, [currentList, searchQuery, statusFilter]);

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#f0f4f5]">
                <p className="text-sm text-slate-400">Please log in</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#121c1d]">Appointments</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={refreshing}
                    className="h-9 rounded-lg w-full sm:w-auto"
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                {(['today', 'pending', 'upcoming'] as TabKey[]).map((tab) => {
                    const label = tab === 'today' ? 'Today' : tab === 'pending' ? 'Pending' : 'Upcoming';
                    const count = tab === 'today' ? stats.today : tab === 'pending' ? stats.pending : stats.upcoming;
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                isActive ? "border-[#0c5d69] text-[#0c5d69]" : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {label}
                            <span className={cn(
                                "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs tabular-nums",
                                isActive ? "bg-[#e6f0f1] text-[#0c5d69]" : "bg-slate-100 text-slate-500"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                        disabled={activeTab === 'pending'}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-lg border-slate-200">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value={AppointmentStatus.PENDING_DOCTOR_CONFIRMATION}>Needs confirm</SelectItem>
                            <SelectItem value={AppointmentStatus.SCHEDULED}>Scheduled</SelectItem>
                            <SelectItem value={AppointmentStatus.CONFIRMED}>Confirmed</SelectItem>
                            <SelectItem value={AppointmentStatus.CHECKED_IN}>Checked in</SelectItem>
                            <SelectItem value={AppointmentStatus.READY_FOR_CONSULTATION}>Ready</SelectItem>
                            <SelectItem value={AppointmentStatus.IN_CONSULTATION}>In consultation</SelectItem>
                            <SelectItem value={AppointmentStatus.COMPLETED}>Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient, file #, type…"
                        className="h-9 pl-9 rounded-lg border-slate-200"
                    />
                </div>
            </div>

            {/* Appointments List */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            ) : filteredList.length === 0 ? (
                <Card className="border border-slate-200 bg-white">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarIcon className="h-10 w-10 text-slate-300 mb-3" />
                        <h3 className="text-sm font-semibold text-[#121c1d] mb-1">
                            {searchQuery ? 'No matching appointments' : `No appointments`}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xs">
                            {searchQuery ? 'Try a different search term or clear filters.' : 'No appointments found for this filter.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden divide-y divide-slate-100">
                    {filteredList.map((apt) => {
                        const patientName = apt.patient
                            ? `${apt.patient.firstName} ${apt.patient.lastName}`
                            : 'Unknown patient';
                        const fileNumber = apt.patient?.fileNumber ? `#${apt.patient.fileNumber}` : null;
                        const when = activeTab !== 'today'
                            ? `${format(new Date(apt.appointmentDate), 'MMM d')} • ${apt.time || '--:--'}`
                            : (apt.time || '--:--');

                        const needsConfirm = apt.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
                        const canStart =
                            apt.status === AppointmentStatus.CHECKED_IN ||
                            apt.status === AppointmentStatus.READY_FOR_CONSULTATION ||
                            apt.status === AppointmentStatus.IN_CONSULTATION;
                        const isCompleted = apt.status === AppointmentStatus.COMPLETED;

                        return (
                            <div
                                key={apt.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-14 text-center shrink-0">
                                        <p className="text-sm font-semibold text-[#121c1d] leading-none tabular-nums">{when}</p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="text-sm font-medium text-[#121c1d] truncate">{patientName}</p>
                                            {fileNumber && (
                                                <span className="shrink-0 text-[10px] font-mono text-slate-400">
                                                    {fileNumber}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">{apt.type || 'Consultation'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 sm:justify-end sm:min-w-[400px]">
                                    <StatusBadge status={apt.status} />

                                    <div className="flex items-center gap-2">
                                        {needsConfirm && (
                                            <>
                                            <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-xs" onClick={() => handleReject(apt.id)}>
                                                Reject
                                            </Button>
                                                <Button size="sm" className="h-8 rounded-lg bg-[#0c5d69] hover:bg-[#0a4f59] text-white text-xs" onClick={() => handleConfirm(apt.id)}>
                                                    <Check className="h-3.5 w-3.5 mr-1" />
                                                    Confirm
                                                </Button>
                                            </>
                                        )}
                                        {canStart && (
                                            <Button size="sm" className="h-8 rounded-lg bg-[#0c5d69] hover:bg-[#0a4f59] text-white text-xs" onClick={() => handleStartConsultation(apt.id)}>
                                                Start
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-xs" onClick={() => router.push(`/doctor/appointments/${apt.id}`)}>
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string }> = {
        PENDING_DOCTOR_CONFIRMATION: { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
        SCHEDULED: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
        CONFIRMED: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
        CHECKED_IN: { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
        READY_FOR_CONSULTATION: { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
        IN_CONSULTATION: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
        COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600' },
        CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500' },
        NO_SHOW: { bg: 'bg-slate-100', text: 'text-slate-500' },
        PENDING: { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
    };

    const c = config[status] || { bg: 'bg-slate-100', text: 'text-slate-600' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}
