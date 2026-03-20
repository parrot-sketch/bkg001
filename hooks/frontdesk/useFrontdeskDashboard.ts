/**
 * Frontdesk Dashboard Hook
 * 
 * Single source of truth for all dashboard data.
 * Uses React Query with proper caching to avoid excessive requests.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';

export interface DashboardStats {
  expectedPatients: number;
  checkedInPatients: number;
  pendingCheckIns: number;
  inConsultation: number;
  completedToday: number;
  pendingIntakeCount: number;
}

export interface UseFrontdeskDashboardReturn {
  stats: DashboardStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Single hook that fetches all dashboard data
 */
export function useFrontdeskDashboard(): UseFrontdeskDashboardReturn {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch today's appointments
  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useQuery({
    queryKey: ['frontdesk', 'schedule', 'today'],
    queryFn: async () => {
      const response = await frontdeskApi.getTodaysSchedule();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch schedule');
      }
      return response.data || [];
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30_000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch pending intake count
  const {
    data: pendingIntakeCount = 0,
    isLoading: loadingIntakes,
  } = useQuery({
    queryKey: ['frontdesk', 'intake', 'pending', 'count'],
    queryFn: async () => {
      const response = await fetch('/api/frontdesk/intake/pending?limit=1&offset=0');
      if (!response.ok) return 0;
      const data = await response.json();
      return typeof data.total === 'number' ? data.total : 0;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  // Calculate stats from appointments
  const stats: DashboardStats = {
    expectedPatients: appointments.length,
    checkedInPatients: appointments.filter(
      (apt) => apt.status === 'CHECKED_IN' || apt.status === 'READY_FOR_CONSULTATION'
    ).length,
    pendingCheckIns: appointments.filter(
      (apt) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
    ).length,
    inConsultation: appointments.filter(
      (apt) => apt.status === 'IN_CONSULTATION'
    ).length,
    completedToday: appointments.filter(
      (apt) => apt.status === 'COMPLETED'
    ).length,
    pendingIntakeCount,
  };

  const isLoading = loadingAppointments || loadingIntakes;
  const error = appointmentsError;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'intake'] });
  };

  return { stats, isLoading, error, refetch };
}
