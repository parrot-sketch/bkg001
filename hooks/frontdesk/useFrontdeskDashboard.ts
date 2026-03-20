/**
 * Frontdesk Dashboard Hook
 * 
 * Single source of truth for all dashboard data.
 * Uses React Query with proper caching to avoid excessive requests.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';

// ─── Types ────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────

const STALE_TIME_MS = 30_000; // 30 seconds
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes

// ─── Query Functions ─────────────────────────────────────────

async function fetchTodaysSchedule(): Promise<unknown[]> {
  const response = await frontdeskApi.getTodaysSchedule();
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch schedule');
  }
  return response.data || [];
}

async function fetchPendingIntakeCount(): Promise<number> {
  const response = await fetch('/api/frontdesk/intake/pending?limit=1&offset=0');
  if (!response.ok) return 0;
  const data = await response.json();
  return typeof data.total === 'number' ? data.total : 0;
}

// ─── Hook ────────────────────────────────────────────────────

export function useFrontdeskDashboard(): UseFrontdeskDashboardReturn {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const isEnabled = isAuthenticated && !!user;

  // Today's appointments
  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useQuery<unknown[]>({
    queryKey: ['frontdesk', 'schedule', 'today'] as const,
    queryFn: fetchTodaysSchedule,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });

  // Pending intake count
  const {
    data: pendingIntakeCount = 0,
    isLoading: loadingIntakes,
  } = useQuery<number>({
    queryKey: ['frontdesk', 'intake', 'pending', 'count'] as const,
    queryFn: fetchPendingIntakeCount,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });

  // Calculate stats
  const stats: DashboardStats = {
    expectedPatients: appointments.length,
    checkedInPatients: appointments.filter(
      (apt: unknown) => {
        const status = (apt as { status?: string }).status;
        return status === 'CHECKED_IN' || status === 'READY_FOR_CONSULTATION';
      }
    ).length,
    pendingCheckIns: appointments.filter(
      (apt: unknown) => {
        const status = (apt as { status?: string }).status;
        return status === 'SCHEDULED' || status === 'CONFIRMED';
      }
    ).length,
    inConsultation: appointments.filter(
      (apt: unknown) => (apt as { status?: string }).status === 'IN_CONSULTATION'
    ).length,
    completedToday: appointments.filter(
      (apt: unknown) => (apt as { status?: string }).status === 'COMPLETED'
    ).length,
    pendingIntakeCount,
  };

  const isLoading = loadingAppointments || loadingIntakes;
  const error = appointmentsError as Error | null;

  const refetch = (): void => {
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'intake'] });
  };

  return { stats, isLoading, error, refetch };
}
