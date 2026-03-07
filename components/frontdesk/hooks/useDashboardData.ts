/**
 * useDashboardData Hook
 * 
 * Aggregates all dashboard data with proper error handling and loading states.
 * Separates business logic from UI components.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayAppointments } from '@/hooks/appointments/useAppointments';

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
        staleTime: 0,
        refetchInterval: 10000, // Poll every 10 seconds for new intakes
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



    // Calculate stats
    const stats: DashboardStats = useMemo(() => {
        const expectedPatients = todayAppointments.length;
        // FIXED: CHECKED_IN / READY_FOR_CONSULTATION = patients already in waiting room
        const checkedInPatients = todayAppointments.filter(
            (apt) => apt.status === 'CHECKED_IN' || apt.status === 'READY_FOR_CONSULTATION'
        ).length;
        // FIXED: SCHEDULED / CONFIRMED = confirmed appointments not yet arrived
        const pendingCheckIns = todayAppointments.filter(
            (apt) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
        ).length;
        const inConsultation = todayAppointments.filter(
            (apt) => apt.status === 'IN_CONSULTATION'
        ).length;
        const completedToday = todayAppointments.filter(
            (apt) => apt.status === 'COMPLETED'
        ).length;

        return {
            expectedPatients,
            checkedInPatients,
            pendingCheckIns,
            inConsultation,
            completedToday,
            pendingIntakeCount,
        };
    }, [todayAppointments, pendingIntakeCount]);

    // Aggregate loading state
    const loading = loadingAppointments || loadingIntakes;

    // Refetch all data
    const refetch = useCallback(() => {
        refetchAppointments();
        refetchIntakes();
    }, [refetchAppointments, refetchIntakes]);

    return {
        stats,
        loading,
        error: null,
        refetch,
    };
}
