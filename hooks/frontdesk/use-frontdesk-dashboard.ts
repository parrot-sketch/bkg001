/**
 * Unified Frontdesk Dashboard Hook
 * 
 * Single source of truth for all dashboard data.
 * Uses React Query with proper caching to avoid excessive requests.
 * 
 * This hook replaces:
 * - useFrontdeskDashboard (stats only)
 * - useTodaysSchedule
 * - useCheckedInAwaitingAssignment
 * - useLiveQueueBoard
 * 
 * All data is fetched in a single server action call with pre-computed stats.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { getFrontdeskDashboardData, revalidateFrontdeskDashboard, type FrontdeskDashboardData, type FrontdeskCheckedInPatient, type FrontdeskQueueEntry } from '@/actions/frontdesk/get-dashboard-data';
import { queryKeys } from '@/lib/constants/queryKeys';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';

// Re-export types for external consumers
export type { FrontdeskCheckedInPatient, FrontdeskQueueEntry };

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
  data: FrontdeskDashboardData | undefined;
  stats: DashboardStats;
  todaysSchedule: FrontdeskDashboardData['todaysSchedule'];
  queue: FrontdeskDashboardData['queue'];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── Selector Hooks ────────────────────────────────────────────
// These hooks allow components to subscribe to specific parts of the dashboard data
// without causing re-renders when unrelated parts change

export function useTodaysSchedule() {
  const { data, isLoading, error } = useFrontdeskDashboard();
  return {
    data: data?.todaysSchedule,
    isLoading,
    error,
  };
}

export function useCheckedInAwaitingAssignment() {
  const { data, isLoading, error, refetch } = useFrontdeskDashboard();
  return {
    data: data?.queue.checkedInAwaitingAssignment,
    isLoading,
    error,
    refetch,
  };
}

export function useLiveQueueBoard() {
  const { data, isLoading, error, refetch } = useFrontdeskDashboard();
  
  // Group queue entries by doctor
  const groupedData = data?.queue.liveQueue.reduce((acc, entry) => {
    const doctorId = entry.doctorId;
    if (!acc[doctorId]) {
      acc[doctorId] = {
        doctorId,
        doctorName: entry.doctorName,
        patients: [],
      };
    }
    acc[doctorId].patients.push(entry);
    return acc;
  }, {} as Record<string, { doctorId: string; doctorName: string; patients: typeof data.queue.liveQueue }>);
  
  return {
    data: groupedData ? Object.values(groupedData) : [],
    isLoading,
    error,
    refetch,
  };
}

export function useDashboardStats() {
  const { data, isLoading, error } = useFrontdeskDashboard();
  return {
    data: data?.stats,
    isLoading,
    error,
  };
}

// ─── Constants ────────────────────────────────────────────────────

const STALE_TIME_MS = 30_000; // 30 seconds - aligns with server action cache
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes
const REFETCH_INTERVAL_MS = 60_000; // 60 seconds - reduced for production performance

// ─── Main Hook ────────────────────────────────────────────────────

export function useFrontdeskDashboard(): UseFrontdeskDashboardReturn {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const prevEnabledRef = useRef(false);

  const isEnabled = isAuthenticated && !!user;

  // Invalidate server-side cache when auth transitions to authenticated
  // This ensures fresh data is fetched after login, not stale cached data
  useEffect(() => {
    if (isEnabled && !prevEnabledRef.current) {
      revalidateFrontdeskDashboard();
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
    }
    prevEnabledRef.current = isEnabled;
  }, [isEnabled, queryClient]);

  const {
    data,
    isLoading,
    error,
  } = useQuery<FrontdeskDashboardData>({
    queryKey: queryKeys.frontdesk.dashboard(user?.id),
    queryFn: async () => {
      const result = await getFrontdeskDashboardData();
      return result;
    },
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const refetch = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
    await revalidateFrontdeskDashboard();
  };

  return {
    data,
    stats: data?.stats ?? {
      expectedPatients: 0,
      checkedInPatients: 0,
      pendingCheckIns: 0,
      inConsultation: 0,
      completedToday: 0,
      pendingIntakeCount: 0,
    },
    todaysSchedule: data?.todaysSchedule ?? {
      scheduled: [],
      checkedIn: [],
      inConsultation: [],
      completed: [],
    },
    queue: data?.queue ?? {
      checkedInAwaitingAssignment: [],
      liveQueue: [],
    },
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ─── Cache Invalidation Helper ────────────────────────────────────

export async function invalidateFrontdeskCache() {
  await revalidateFrontdeskDashboard();
}

// ─── Check-In Mutation ────────────────────────────────────────────

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, notes }: { appointmentId: number; notes?: string }) => {
      const response = await frontdeskApi.checkInPatient(appointmentId, { notes });

      if (!response.success) {
        throw new Error(response.error || 'Failed to check in patient');
      }

      return response.data;
    },
    onSuccess: () => {
      // Fire-and-forget: don't await server action — it blocks invalidation if slow
      revalidateFrontdeskDashboard();

      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments() });
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.byDate(today) });

      toast.success('Patient checked in successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check in patient');
    },
  });
}