/**
 * useDashboardData Hook
 * 
 * Aggregates all dashboard data with proper error handling and loading states.
 * Separates business logic from UI components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayAppointments, usePendingConsultations } from '@/hooks/appointments/useAppointments';
import { ConsultationStats } from '@/utils/consultation-filters';
import type { DashboardStats, UseDashboardDataReturn } from '@/types/dashboard';

export function useDashboardData(): UseDashboardDataReturn {
    const { user, isAuthenticated } = useAuth();

    // Fetch pending intake count using React Query
    const {
        data: pendingIntakeCount = 0,
        isLoading: loadingIntakes,
        refetch: refetchIntakes,
    } = useQuery({
        queryKey: ['frontdesk', 'intake', 'pending', 'count'],
        queryFn: async () => {
            const response = await fetch('/api/frontdesk/intake/pending?limit=1&offset=0');
            if (response.ok) {
                const data = await response.json();
                // Ensure we handle API response differences safely
                return typeof data.total === 'number' ? data.total : 0;
            }
            return 0;
        },
        enabled: isAuthenticated && !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10,
        retry: 1,
        refetchOnWindowFocus: true,
    });

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
        refetchIntakes();
    }, [refetchAppointments, refetchConsultations, refetchIntakes]);

    return {
        stats,
        loading,
        error: null,
        refetch,
    };
}
