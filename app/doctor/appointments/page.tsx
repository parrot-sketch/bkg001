'use client';

/**
 * Doctor Appointments - SIMPLIFIED PAGE
 * 
 * Simplified view focused on:
 * - Today's appointments (default view)
 * - Upcoming appointments
 * - Pending confirmations (action required)
 * 
 * Queue management is handled on the dashboard.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, CheckCircle, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format, isToday, startOfDay, isTomorrow } from 'date-fns';
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

        // Sort by time
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

    const [activeTab, setActiveTab] = useState<TabKey>('today');

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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-stone-500 font-medium">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <h1 className="text-xl font-semibold text-stone-900">Appointments</h1>
                    </div>
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => refetch()} disabled={refreshing}
                        className="text-stone-500 gap-1.5"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard label="Today" value={stats.today} />
                    <StatCard label="Pending" value={stats.pending} />
                    <StatCard label="Completed" value={stats.completed} />
                    <StatCard label="Upcoming" value={stats.upcoming} />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-stone-200">
                    {(['today', 'pending', 'upcoming'] as TabKey[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab
                                    ? "border-stone-900 text-stone-900"
                                    : "border-transparent text-stone-500 hover:text-stone-700"
                            )}
                        >
                            {tab === 'today' ? "Today's Schedule" 
                                : tab === 'pending' ? "Pending Confirmations" 
                                : "Upcoming"}
                            {tab === 'pending' && stats.pending > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full">
                                    {stats.pending}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Appointment List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                        <p>No appointments</p>
                    </div>
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

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 rounded-lg border border-stone-200 bg-white">
            <p className="text-xs text-stone-400 font-medium">{label}</p>
            <p className="text-2xl font-bold text-stone-900 tabular-nums">{value}</p>
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
        <div className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-colors">
            {/* Time */}
            <div className="text-center min-w-[60px]">
                <p className="text-lg font-semibold text-stone-900">
                    {appointment.time || '--:--'}
                </p>
            </div>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 truncate">{patientName}</p>
                <p className="text-sm text-stone-500 truncate">
                    {appointment.type || 'Consultation'}
                </p>
            </div>

            {/* Status Badge */}
            <div>
                {isPending && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-600 text-xs rounded-md">
                        <AlertTriangle className="h-3 w-3" />
                        Pending
                    </span>
                )}
                {isScheduled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-600 text-xs rounded-md">
                        <Clock className="h-3 w-3" />
                        Scheduled
                    </span>
                )}
                {isCheckedIn && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-700 text-xs rounded-md font-medium">
                        Waiting
                    </span>
                )}
                {isInConsultation && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-700 text-xs rounded-md font-medium">
                        <Play className="h-3 w-3" />
                        In Progress
                    </span>
                )}
                {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-500 text-xs rounded-md">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {isPending && (
                    <>
                        <Button 
                            size="sm" 
                            className="text-xs bg-stone-900 hover:bg-black"
                            onClick={() => onConfirm(appointment.id)}
                        >
                            Confirm
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs text-stone-500 border-stone-200 hover:bg-stone-50"
                            onClick={() => onReject(appointment.id)}
                        >
                            Reject
                        </Button>
                    </>
                )}
                {isScheduled && (
                    <Button 
                        size="sm" 
                        className="text-xs bg-stone-900 hover:bg-black"
                        onClick={() => onCheckIn(appointment.id)}
                    >
                        Check In
                    </Button>
                )}
                {isCheckedIn && (
                    <Button 
                        size="sm" 
                        className="text-xs bg-stone-900 hover:bg-black"
                        onClick={() => onStart(appointment.id)}
                    >
                        Start
                    </Button>
                )}
            </div>
        </div>
    );
}
