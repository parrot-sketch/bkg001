'use client';

/**
 * Doctor Appointments Page — Clean Workflow-Oriented Design
 * 
 * Features:
 * - Pending confirmations prominently surfaced
 * - Clear status-driven action buttons
 * - Patient context always visible
 * - Tab-based navigation with smart defaults
 */

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Calendar as CalendarIcon, Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

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

    // Default to 'pending' tab if there are pending confirmations
    const initialTab: TabKey = pendingConfirmations.length > 0 ? 'pending' : 
        (searchParams.get('tab') as TabKey) || 'today';
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    // Refetch data periodically for status updates
    useEffect(() => {
        const interval = setInterval(() => refetch(), 60000);
        return () => clearInterval(interval);
    }, [refetch]);

    const handleCheckIn = async (appointmentId: number) => {
        if (!user) return;
        try {
            const response = await doctorApi.checkInPatient(appointmentId, user.id);
            if (response.success) {
                toast.success('Patient checked in');
                refetch();
            } else {
                toast.error(response.error || 'Failed to check in');
            }
        } catch (error) {
            toast.error('Error checking in patient');
        }
    };

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
        } catch (error) {
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
        } catch (error) {
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
        // Keep filters sane when switching tabs
        if (activeTab === 'pending') {
            setStatusFilter(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
        } else if (statusFilter === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
            setStatusFilter('ALL');
        }
        // Clear search when switching context (reduces "empty table confusion")
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
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <p className="text-sm text-slate-400">Please log in</p>
            </div>
        );
    }

    return (
        <ClinicalDashboardShell>
            <div className="space-y-4 pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={refreshing}
                            className="h-9 rounded-none"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 border-b border-border sm:border-b-0">
                        {(['today', 'pending', 'upcoming'] as TabKey[]).map((tab) => {
                            const label =
                                tab === 'today' ? 'Today'
                                    : tab === 'pending' ? 'Pending'
                                        : 'Upcoming';
                            const count =
                                tab === 'today' ? stats.today
                                    : tab === 'pending' ? stats.pending
                                        : stats.upcoming;
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-3 py-2 text-xs font-medium rounded-none border-b-2 transition-colors",
                                        isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {label}
                                    <span className={cn(
                                        "ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] tabular-nums",
                                        isActive ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">Status</div>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                                disabled={activeTab === 'pending'}
                            >
                                <SelectTrigger className="h-9 w-[180px] rounded-none">
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

                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search patient, file #, type…"
                                className="h-9 pl-9 w-full sm:w-[260px] rounded-none"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                ) : filteredList.length === 0 ? (
                    <EmptyState tab={activeTab} hasQuery={Boolean(searchQuery.trim())} />
                ) : (
                    <div className="border border-border bg-background">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[110px]">When</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead className="hidden md:table-cell">Type</TableHead>
                                    <TableHead className="hidden lg:table-cell">Note</TableHead>
                                    <TableHead className="w-[140px]">Status</TableHead>
                                    <TableHead className="w-[220px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredList.map((apt) => (
                                    <AppointmentsTableRow
                                        key={apt.id}
                                        appointment={apt}
                                        showDate={activeTab !== 'today'}
                                        onView={() => router.push(`/doctor/appointments/${apt.id}`)}
                                        onStart={() => handleStartConsultation(apt.id)}
                                        onConfirm={() => handleConfirm(apt.id)}
                                        onReject={() => handleReject(apt.id)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </ClinicalDashboardShell>
    );
}

function EmptyState({ tab, hasQuery }: { tab: string; hasQuery: boolean }) {
    const messages = {
        today: { title: "No appointments today", description: "Your schedule is clear for today." },
        upcoming: { title: "No upcoming appointments", description: "No future appointments scheduled." },
        pending: { title: "No pending confirmations", description: "All appointments have been confirmed or rejected." },
    };
    
    const msg = messages[tab as keyof typeof messages];
    
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
                {hasQuery ? 'No matching appointments' : msg.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
                {hasQuery ? 'Try a different search term or clear filters.' : msg.description}
            </p>
        </div>
    );
}

function getStatusLabel(status: string): string {
    switch (status) {
        case AppointmentStatus.PENDING_DOCTOR_CONFIRMATION:
            return 'Needs confirm';
        case AppointmentStatus.SCHEDULED:
            return 'Scheduled';
        case AppointmentStatus.CONFIRMED:
            return 'Confirmed';
        case AppointmentStatus.CHECKED_IN:
            return 'Checked in';
        case AppointmentStatus.READY_FOR_CONSULTATION:
            return 'Ready';
        case AppointmentStatus.IN_CONSULTATION:
            return 'In consultation';
        case AppointmentStatus.COMPLETED:
            return 'Completed';
        default:
            return status;
    }
}

function AppointmentsTableRow({
    appointment,
    showDate,
    onView,
    onStart,
    onConfirm,
    onReject,
}: {
    appointment: AppointmentResponseDto;
    showDate: boolean;
    onView: () => void;
    onStart: () => void;
    onConfirm: () => void;
    onReject: () => void;
}) {
    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Unknown patient';
    const fileNumber = appointment.patient?.fileNumber ? `#${appointment.patient.fileNumber}` : null;
    const when = showDate
        ? `${format(new Date(appointment.appointmentDate), 'MMM d')} • ${appointment.time || '--:--'}`
        : (appointment.time || '--:--');

    const needsConfirm = appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    const canStart =
        appointment.status === AppointmentStatus.CHECKED_IN ||
        appointment.status === AppointmentStatus.READY_FOR_CONSULTATION ||
        appointment.status === AppointmentStatus.IN_CONSULTATION;

    return (
        <TableRow className="cursor-default">
            <TableCell className="py-3">
                <div className="text-sm font-medium text-foreground tabular-nums">{when}</div>
            </TableCell>
            <TableCell className="py-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="truncate text-sm text-foreground font-medium">{patientName}</div>
                        {fileNumber && (
                            <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                                {fileNumber}
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-3 hidden md:table-cell">
                <div className="text-sm text-muted-foreground">{appointment.type || 'Consultation'}</div>
            </TableCell>
            <TableCell className="py-3 hidden lg:table-cell">
                <div className="text-sm text-muted-foreground truncate max-w-[460px]">
                    {appointment.note || '—'}
                </div>
            </TableCell>
            <TableCell className="py-3">
                <Badge variant="outline" className="rounded-none text-xs font-medium">
                    {getStatusLabel(appointment.status)}
                </Badge>
            </TableCell>
            <TableCell className="py-3 text-right">
                <div className="inline-flex items-center gap-2 justify-end">
                    {needsConfirm && (
                        <>
                            <Button size="sm" variant="outline" className="h-8 rounded-none" onClick={onReject}>
                                <X className="h-4 w-4 mr-1.5" />
                                Reject
                            </Button>
                            <Button size="sm" className="h-8 rounded-none" onClick={onConfirm}>
                                <Check className="h-4 w-4 mr-1.5" />
                                Confirm
                            </Button>
                        </>
                    )}
                    {canStart && !needsConfirm && (
                        <Button size="sm" variant="outline" className="h-8 rounded-none" onClick={onStart}>
                            Start
                        </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 rounded-none" onClick={onView}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
