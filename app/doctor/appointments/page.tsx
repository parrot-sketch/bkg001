'use client';

/**
 * Doctor Appointments & Consultations - UNIFIED PAGE
 * 
 * REFACTORED: Extracted core UI into standalone components.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { format, isToday, startOfDay } from 'date-fns';
import { CompleteConsultationDialog } from '@/components/doctor/CompleteConsultationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Refactored Components
import { AppointmentRow, getStatusConfig } from './components/AppointmentRow';
import { AppointmentStats } from './components/AppointmentStats';
import { AppointmentSection } from './components/AppointmentSection';
import { AppointmentTabs } from './components/AppointmentTabs';
import { ConsultationHistory } from './components/ConsultationHistory';

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

type TabKey = 'today' | 'upcoming' | 'past';

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
    const [showCompleteConsultation, setShowCompleteConsultation] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('today');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: appointmentData,
        isLoading: loading,
        isRefetching: refreshing,
        refetch
    } = useDoctorAppointments(user?.id, ALL_ACTIVE_STATUSES, isAuthenticated && !!user);

    const appointments = appointmentData || [];

    const handleCheckIn = async (appointmentId: number) => {
        if (!user) return;
        try {
            const response = await doctorApi.checkInPatient(appointmentId, user.id);
            if (response.success) {
                toast.success('Patient checked in successfully');
                refetch();
            } else {
                toast.error(response.error || 'Failed to check in patient');
            }
        } catch (error) {
            toast.error('An error occurred while checking in');
        }
    };

    const handleStartConsultation = (appointment: AppointmentResponseDto) => {
        router.push(`/doctor/consultations/${appointment.id}/session`);
    };

    const handleCompleteConsultation = (appointment: AppointmentResponseDto) => {
        setSelectedAppointment(appointment);
        setShowCompleteConsultation(true);
    };

    const handleConsultationSuccess = () => {
        setShowCompleteConsultation(false);
        setSelectedAppointment(null);
        refetch();
    };

    const parsedData = useMemo(() => {
        const today = startOfDay(new Date());
        const todayList: AppointmentResponseDto[] = [];
        const upcomingList: AppointmentResponseDto[] = [];
        const pastList: AppointmentResponseDto[] = [];
        const activeConsultations: AppointmentResponseDto[] = [];
        const pendingConfirmations: AppointmentResponseDto[] = [];
        const waitingQueue: AppointmentResponseDto[] = [];

        for (const apt of appointments) {
            const aptDate = startOfDay(new Date(apt.appointmentDate));
            if (apt.status === AppointmentStatus.IN_CONSULTATION) {
                activeConsultations.push(apt);
            } else if (apt.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
                pendingConfirmations.push(apt);
            } else if (apt.status === AppointmentStatus.CHECKED_IN || apt.status === AppointmentStatus.READY_FOR_CONSULTATION) {
                waitingQueue.push(apt);
            }

            if (isToday(aptDate)) {
                todayList.push(apt);
            } else if (aptDate > today) {
                upcomingList.push(apt);
            } else {
                pastList.push(apt);
            }
        }

        const sortByPriority = (a: AppointmentResponseDto, b: AppointmentResponseDto) => {
            const orderA = getStatusConfig(a.status).sortOrder;
            const orderB = getStatusConfig(b.status).sortOrder;
            if (orderA !== orderB) return orderA - orderB;
            return (a.time || '').localeCompare(b.time || '');
        };

        activeConsultations.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        pendingConfirmations.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        waitingQueue.sort(sortByPriority);
        todayList.sort(sortByPriority);
        upcomingList.sort((a, b) => {
            const dateA = new Date(a.appointmentDate).getTime();
            const dateB = new Date(b.appointmentDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.time || '').localeCompare(b.time || '');
        });
        pastList.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

        const completedConsultations = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED);
        const consultationHistory: { label: string; items: AppointmentResponseDto[] }[] = [];
        if (completedConsultations.length > 0) {
            const now = new Date();
            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const todayHistory: AppointmentResponseDto[] = [];
            const yesterdayHistory: AppointmentResponseDto[] = [];
            const earlierHistory: AppointmentResponseDto[] = [];
            for (const c of completedConsultations) {
                const d = new Date(c.appointmentDate);
                if (d.toDateString() === now.toDateString()) todayHistory.push(c);
                else if (d.toDateString() === yesterdayDate.toDateString()) yesterdayHistory.push(c);
                else earlierHistory.push(c);
            }
            if (todayHistory.length > 0) consultationHistory.push({ label: 'Today', items: todayHistory });
            if (yesterdayHistory.length > 0) consultationHistory.push({ label: 'Yesterday', items: yesterdayHistory });
            if (earlierHistory.length > 0) consultationHistory.push({ label: 'Earlier', items: earlierHistory });
        }

        const needsAction = [...pendingConfirmations, ...waitingQueue].length;
        const totalDuration = completedConsultations.reduce((sum, c) => sum + (c.consultationDuration || 0), 0);
        const avgDuration = completedConsultations.length > 0 ? Math.round(totalDuration / completedConsultations.length) : 0;

        return {
            today: todayList,
            upcoming: upcomingList,
            past: pastList,
            activeConsultations,
            pendingConfirmations,
            waitingQueue,
            consultationHistory,
            stats: {
                total: todayList.length,
                needsAction,
                inProgress: activeConsultations.length,
                completed: todayList.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
                upcoming: upcomingList.length,
                avgDuration,
            },
        };
    }, [appointments]);

    const activeList = useMemo(() => parsedData[activeTab], [parsedData, activeTab]);

    const filteredList = useMemo(() => {
        let list = activeList;
        if (statusFilter !== 'ALL') {
            list = list.filter((apt) => apt.status === statusFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((apt) => {
                const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}`.toLowerCase() : '';
                return patientName.includes(q) || (apt.type || '').toLowerCase().includes(q) || (apt.time || '').includes(q);
            });
        }
        return list;
    }, [activeList, statusFilter, searchQuery]);

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

    return (
        <ClinicalDashboardShell>
            <div className="space-y-5 animate-in fade-in duration-500 pb-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <p className="text-xs text-stone-500 font-medium mb-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Appointments</h1>
                    </div>
                    <Button
                        variant="ghost" size="sm" className="text-xs text-stone-500 gap-1.5 self-start sm:self-auto hover:text-stone-700"
                        onClick={() => refetch()} disabled={refreshing}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                <AppointmentStats stats={parsedData.stats} loading={loading} />

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AppointmentSection
                            title="Active Consultations" icon={Play} iconColor="text-violet-600"
                            appointments={parsedData.activeConsultations}
                            onCheckIn={handleCheckIn} onStartConsultation={handleStartConsultation} onCompleteConsultation={handleCompleteConsultation}
                        />
                        <AppointmentSection
                            title="Pending Confirmations" icon={AlertTriangle} iconColor="text-orange-500"
                            appointments={parsedData.pendingConfirmations}
                            onCheckIn={handleCheckIn} onStartConsultation={handleStartConsultation} onCompleteConsultation={handleCompleteConsultation}
                        />
                        <AppointmentSection
                            title="Waiting Queue" icon={Clock} iconColor="text-emerald-600"
                            appointments={parsedData.waitingQueue}
                            onCheckIn={handleCheckIn} onStartConsultation={handleStartConsultation} onCompleteConsultation={handleCompleteConsultation}
                        />

                        <AppointmentTabs
                            activeTab={activeTab} onTabChange={setActiveTab}
                            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                            searchQuery={searchQuery} onSearchChange={setSearchQuery}
                            appointments={parsedData} filteredList={filteredList}
                            onCheckIn={handleCheckIn} onStartConsultation={handleStartConsultation} onCompleteConsultation={handleCompleteConsultation}
                        />

                        <ConsultationHistory
                            groups={parsedData.consultationHistory}
                            onCheckIn={handleCheckIn} onStartConsultation={handleStartConsultation} onCompleteConsultation={handleCompleteConsultation}
                        />

                        {!loading && Object.values(parsedData).every(val => Array.isArray(val) && val.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-stone-200">
                                <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-3">
                                    <Play className="h-5 w-5 text-stone-300" />
                                </div>
                                <h3 className="text-sm font-medium text-stone-700">No appointments</h3>
                                <p className="text-xs text-stone-400 max-w-xs text-center mt-1">No appointments or consultations scheduled.</p>
                            </div>
                        )}
                    </div>
                )}

                {showCompleteConsultation && selectedAppointment && (
                    <CompleteConsultationDialog
                        open={showCompleteConsultation}
                        onClose={() => { setShowCompleteConsultation(false); setSelectedAppointment(null); }}
                        onSuccess={handleConsultationSuccess}
                        appointment={selectedAppointment} doctorId={user.id}
                    />
                )}
            </div>
        </ClinicalDashboardShell>
    );
}
