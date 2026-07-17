/**
 * Refactored Frontdesk Dashboard Hooks
 * 
 * Provides split, per-section query hooks that isolate cache queries and re-renders.
 * Uses React Query select options to minimize updates and leverages Next.js unstable_cache
 * for high-performance server action execution.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { 
  getFrontdeskDashboardData, 
  revalidateFrontdeskDashboard, 
  type FrontdeskDashboardData, 
  type FrontdeskCheckedInPatient, 
  type FrontdeskQueueEntry 
} from '@/actions/frontdesk/get-dashboard-data';
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

// ─── Constants ────────────────────────────────────────────────────

const STALE_TIME_MS = 30_000; // 30 seconds - aligns with server action cache
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes
const REFETCH_INTERVAL_MS = 120_000; // 2 minutes - appropriate for operational dashboard

// ─── Individual Section Hooks ─────────────────────────────────────

/**
 * Hook to subscribe to stats only.
 */
export function useDashboardStats() {
  const { user, isAuthenticated } = useAuth();
  const isEnabled = isAuthenticated && !!user;

  return useQuery<FrontdeskDashboardData, Error, DashboardStats>({
    queryKey: [...queryKeys.frontdesk.stats(), user?.id || 'default'] as const,
    queryFn: getFrontdeskDashboardData,
    select: (data) => data.stats,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to subscribe to today's schedule lane lists.
 */
export function useTodaysSchedule() {
  const { user, isAuthenticated } = useAuth();
  const isEnabled = isAuthenticated && !!user;

  return useQuery<FrontdeskDashboardData, Error, FrontdeskDashboardData['todaysSchedule']>({
    queryKey: [...queryKeys.frontdesk.todaysSchedule(), user?.id || 'default'] as const,
    queryFn: getFrontdeskDashboardData,
    select: (data) => data.todaysSchedule,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to subscribe to checked-in patients awaiting assignment.
 */
export function useCheckedInAwaitingAssignment() {
  const { user, isAuthenticated } = useAuth();
  const isEnabled = isAuthenticated && !!user;

  return useQuery<FrontdeskDashboardData, Error, FrontdeskCheckedInPatient[]>({
    queryKey: [...queryKeys.frontdesk.checkedInAwaitingAssignment(), user?.id || 'default'] as const,
    queryFn: getFrontdeskDashboardData,
    select: (data) => data.queue.checkedInAwaitingAssignment,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to subscribe to the live queue board, returning grouped-by-doctor queue entries.
 */
export function useLiveQueueBoard() {
  const { user, isAuthenticated } = useAuth();
  const isEnabled = isAuthenticated && !!user;

  const queryResult = useQuery<FrontdeskDashboardData, Error, FrontdeskQueueEntry[]>({
    queryKey: [...queryKeys.frontdesk.liveQueueBoard(), user?.id || 'default'] as const,
    queryFn: getFrontdeskDashboardData,
    select: (data) => data.queue.liveQueue,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const groupedData = useMemo(() => {
    if (!queryResult.data) return [];
    
    const acc: Record<string, { doctorId: string; doctorName: string; patients: FrontdeskQueueEntry[] }> = {};
    queryResult.data.forEach((entry) => {
      const doctorId = entry.doctorId;
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctorId,
          doctorName: entry.doctorName,
          patients: [],
        };
      }
      acc[doctorId].patients.push(entry);
    });
    return Object.values(acc);
  }, [queryResult.data]);

  return {
    ...queryResult,
    data: groupedData,
  };
}

// ─── Backward Compatibility / God Hook ────────────────────────────

export function useFrontdeskDashboard(): UseFrontdeskDashboardReturn {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const prevEnabledRef = useRef(false);

  const isEnabled = isAuthenticated && !!user;

  useEffect(() => {
    if (isEnabled && !prevEnabledRef.current) {
      queryClient.invalidateQueries({ queryKey: ['frontdesk'] });
    }
    prevEnabledRef.current = isEnabled;
  }, [isEnabled, queryClient]);

  const queryResult = useQuery<FrontdeskDashboardData, Error>({
    queryKey: [...queryKeys.frontdesk.dashboard(), user?.id || 'default'] as const,
    queryFn: getFrontdeskDashboardData,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const refetch = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['frontdesk'] });
    await revalidateFrontdeskDashboard();
  };

  return {
    data: queryResult.data,
    stats: queryResult.data?.stats ?? {
      expectedPatients: 0,
      checkedInPatients: 0,
      pendingCheckIns: 0,
      inConsultation: 0,
      completedToday: 0,
    },
    todaysSchedule: queryResult.data?.todaysSchedule ?? {
      scheduled: [],
      checkedIn: [],
      inConsultation: [],
      completed: [],
    },
    queue: queryResult.data?.queue ?? {
      checkedInAwaitingAssignment: [],
      liveQueue: [],
    },
    isLoading: queryResult.isLoading,
    error: queryResult.error,
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
    onMutate: async () => {
      // Invalidate rather than optimistic update to avoid cross-query key syncing issues on split keys
      await queryClient.cancelQueries({ queryKey: ['frontdesk'] });
    },
    onError: () => {
      toast.error('Failed to check in patient');
    },
    onSuccess: () => {
      revalidateFrontdeskDashboard();
      queryClient.invalidateQueries({ queryKey: ['frontdesk'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments() });
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.byDate(today) });

      toast.success('Patient checked in successfully');
    },
  });
}