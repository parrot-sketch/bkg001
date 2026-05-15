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
import { RefreshCw, Play, CheckCircle, Clock, Calendar as CalendarIcon, 
         AlertTriangle, User, Stethoscope, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format, isToday, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated } = useAuth();

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
        let completedToday = 0;

        for (const apt of appointments) {
            const aptDate = new Date(apt.appointmentDate);
            
            if (apt.status === AppointmentStatus.COMPLETED && isToday(aptDate)) {
                completedToday++;
            }
            
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
                completed: completedToday,
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

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <p className="text-sm text-slate-400">Please log in</p>
            </div>
        );
    }

    return (
        <ClinicalDashboardShell>
            <div className="space-y-6 pb-8">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Today" value={stats.today} variant="default" />
                    <StatCard label="Pending" value={stats.pending} variant="warning" />
                    <StatCard label="Completed" value={stats.completed} variant="success" />
                    <StatCard label="Upcoming" value={stats.upcoming} variant="default" />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-slate-200">
                    {(['today', 'pending', 'upcoming'] as TabKey[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {tab === 'today' ? "Today's Schedule" 
                                : tab === 'pending' ? "Pending Confirmations" 
                                : "Upcoming"}
                            {tab === 'pending' && stats.pending > 0 && (
                                <Badge className="ml-2 bg-amber-100 text-amber-700" variant="secondary">
                                    {stats.pending}
                                </Badge>
                            )}
                        </button>
                    ))}
                </div>

                {/* Pending Confirmations Alert */}
                {activeTab === 'pending' && pendingConfirmations.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">
                                Action Required: {pendingConfirmations.length} appointment{pendingConfirmations.length !== 1 ? 's' : ''} awaiting confirmation
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                Click "Confirm" to accept or "Reject" to decline with a reason.
                            </p>
                        </div>
                    </div>
                )}

                {/* Appointment List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                ) : currentList.length === 0 ? (
                    <EmptyState tab={activeTab} />
                ) : (
                    <div className="space-y-2">
                        {currentList.map((apt) => (
                            <AppointmentCard
                                key={apt.id}
                                appointment={apt}
                                onCheckIn={handleCheckIn}
                                onStart={handleStartConsultation}
                                onConfirm={handleConfirm}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </ClinicalDashboardShell>
    );
}

function StatCard({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'warning' | 'success' }) {
    const variants = {
        default: 'bg-white border-slate-200',
        warning: value > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
        success: 'bg-emerald-50 border-emerald-200',
    };
    
    return (
        <div className={cn("p-4 rounded-lg border", variants[variant])}>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
    );
}

function EmptyState({ tab }: { tab: string }) {
    const messages = {
        today: { title: "No appointments today", description: "Your schedule is clear for today." },
        upcoming: { title: "No upcoming appointments", description: "No future appointments scheduled." },
        pending: { title: "No pending confirmations", description: "All appointments have been confirmed or rejected." },
    };
    
    const msg = messages[tab as keyof typeof messages];
    
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">{msg.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{msg.description}</p>
        </div>
    );
}

function AppointmentCard({ 
    appointment, 
    onCheckIn, 
    onStart,
    onConfirm,
    onReject,
}: { 
    appointment: AppointmentResponseDto;
    onCheckIn: (id: number) => void;
    onStart: (id: number) => void;
    onConfirm: (id: number) => void;
    onReject: (id: number) => void;
}) {
    const status = appointment.status;
    const isPending = status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    const isScheduled = status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED;
    const isCheckedIn = status === AppointmentStatus.CHECKED_IN || status === AppointmentStatus.READY_FOR_CONSULTATION;
    const isInConsultation = status === AppointmentStatus.IN_CONSULTATION;
    const isCompleted = status === AppointmentStatus.COMPLETED;

    const patientName = appointment.patient 
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Unknown Patient';

    return (
        <Link href={`/doctor/appointments/${appointment.id}`} className="block">
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
                {/* Time */}
                <div className="text-center min-w-[60px]">
                    <p className="text-lg font-semibold text-slate-900">
                        {appointment.time || '--:--'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                        {appointment.appointmentDate && format(new Date(appointment.appointmentDate), 'MMM d')}
                    </p>
                </div>

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{patientName}</p>
                        {appointment.patient?.fileNumber && (
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{appointment.patient.fileNumber}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                        {appointment.type || 'Consultation'}
                    </p>
                    {appointment.note && (
                        <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">
                            {appointment.note}
                        </p>
                    )}
                </div>

                {/* Status Badge */}
                <BadgeStatus status={status} />

                {/* Action Indicator */}
                <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
        </Link>
    );
}

function BadgeStatus({ status }: { status: string }) {
    const statusConfig = {
        [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        [AppointmentStatus.SCHEDULED]: { label: 'Scheduled', className: 'bg-slate-100 text-slate-700 border-slate-300' },
        [AppointmentStatus.CONFIRMED]: { label: 'Confirmed', className: 'bg-slate-100 text-slate-700 border-slate-300' },
        [AppointmentStatus.CHECKED_IN]: { label: 'Waiting', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        [AppointmentStatus.READY_FOR_CONSULTATION]: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        [AppointmentStatus.IN_CONSULTATION]: { label: 'In Session', className: 'bg-violet-50 text-violet-700 border-violet-200' },
        [AppointmentStatus.COMPLETED]: { label: 'Completed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-slate-100' };

    return (
        <span className={cn("px-2.5 py-1 text-xs font-medium rounded-md border", config.className)}>
            {config.label}
        </span>
    );
}