/**
 * useDashboardData Hook
 * 
 * Aggregates all dashboard data with proper error handling and loading states.
 * Separates business logic from UI components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayAppointments, usePendingConsultations } from '@/hooks/appointments/useAppointments';
import { ConsultationStats } from '@/utils/consultation-filters';
import type { DashboardStats, UseDashboardDataReturn } from '@/types/dashboard';

export function useDashboardData(): UseDashboardDataReturn {
    const { user, isAuthenticated } = useAuth();
    const [pendingIntakeCount, setPendingIntakeCount] = useState(0);
    const [loadingIntakes, setLoadingIntakes] = useState(false);

    // Fetch appointments and consultations
    const {
        data: todayAppointments = [],
        isLoading: loadingAppointments,
        refetch: refetchAppointments,
    } = useTodayAppointments(isAuthenticated && !!user);

    const {
        data: pendingConsultations = [],
        isLoading: loadingConsultations,
        refetch: refetchConsultations,
    } = usePendingConsultations(isAuthenticated && !!user);

    // Fetch pending intake count
    const fetchPendingIntakes = useCallback(async () => {
        if (!isAuthenticated || !user) return;

        try {
            setLoadingIntakes(true);
            const response = await fetch('/api/frontdesk/intake/pending?limit=1&offset=0');
            if (response.ok) {
                const data = await response.json();
                setPendingIntakeCount(data.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch pending intakes:', error);
            setPendingIntakeCount(0);
        } finally {
            setLoadingIntakes(false);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        fetchPendingIntakes();
    }, [fetchPendingIntakes]);

    // Calculate stats
    const stats: DashboardStats = useMemo(() => {
        const expectedPatients = todayAppointments.length;
        const checkedInPatients = todayAppointments.filter(
            (apt) => apt.status === 'SCHEDULED'
        ).length;
        const pendingCheckIns = todayAppointments.filter(
            (apt) => apt.status === 'PENDING'
        ).length;

        return {
            expectedPatients,
            checkedInPatients,
            pendingCheckIns,
            newInquiries: ConsultationStats.countNewInquiries(pendingConsultations),
            awaitingClarification: ConsultationStats.countAwaitingClarification(pendingConsultations),
            awaitingScheduling: ConsultationStats.countAwaitingScheduling(pendingConsultations),
            pendingIntakeCount,
        };
    }, [todayAppointments, pendingConsultations, pendingIntakeCount]);

    // Aggregate loading state
    const loading = loadingAppointments || loadingConsultations || loadingIntakes;

    // Refetch all data
    const refetch = useCallback(() => {
        refetchAppointments();
        refetchConsultations();
        fetchPendingIntakes();
    }, [refetchAppointments, refetchConsultations, fetchPendingIntakes]);

    return {
        stats,
        loading,
        error: null, // Can be enhanced with error handling
        refetch,
    };
}
