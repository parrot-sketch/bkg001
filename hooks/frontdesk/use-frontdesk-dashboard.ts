/**
 * Frontdesk Dashboard Hooks
 *
 * All dashboard sections share ONE React Query key + ONE server-action fetch.
 * Section hooks use `select` so components only re-render for their slice.
 *
 * Previously each section used a different queryKey with the same heavy
 * queryFn, which caused N parallel POSTs of getFrontdeskDashboardData on
 * every dashboard mount (and kept hammering Aiven from the sidebar).
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import {
  getFrontdeskDashboardData,
  revalidateFrontdeskDashboard,
  type FrontdeskDashboardData,
  type FrontdeskCheckedInPatient,
  type FrontdeskQueueEntry,
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
  pendingIntakeCount: number;
  newPatientsToday: number;
  scheduledProcedures: number;
  inTheater: number;
  completedSurgeriesToday: number;
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

const STALE_TIME_MS = 60_000; // 60s — enough to absorb remounts / focus thrash
const GC_TIME_MS = 5 * 60 * 1000;
const REFETCH_INTERVAL_MS = 180_000; // 3 min — operational, not realtime telemetry

const EMPTY_STATS: DashboardStats = {
  expectedPatients: 0,
  checkedInPatients: 0,
  pendingCheckIns: 0,
  inConsultation: 0,
  completedToday: 0,
  pendingIntakeCount: 0,
  newPatientsToday: 0,
  scheduledProcedures: 0,
  inTheater: 0,
  completedSurgeriesToday: 0,
};

const EMPTY_SCHEDULE: FrontdeskDashboardData['todaysSchedule'] = {
  scheduled: [],
  checkedIn: [],
  inConsultation: [],
  completed: [],
};

const EMPTY_QUEUE: FrontdeskDashboardData['queue'] = {
  checkedInAwaitingAssignment: [],
  liveQueue: [],
};

function dashboardQueryKey(userId: string) {
  return queryKeys.frontdesk.dashboard(userId);
}

/**
 * Shared dashboard query — every section hook MUST use this key so React Query
 * dedupes to a single server-action call.
 */
function useSharedDashboardQuery<TData = FrontdeskDashboardData>(
  select?: (data: FrontdeskDashboardData) => TData,
) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || 'default';
  const isEnabled = isAuthenticated && !!user;

  return useQuery<FrontdeskDashboardData, Error, TData>({
    queryKey: dashboardQueryKey(userId),
    queryFn: getFrontdeskDashboardData,
    select,
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    // Window-focus refetch was amplifying load on flaky laptop focus switches
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

// ─── Individual Section Hooks ─────────────────────────────────────

export function useDashboardStats() {
  return useSharedDashboardQuery((data) => data.stats);
}

export function useTodaysSchedule() {
  return useSharedDashboardQuery((data) => data.todaysSchedule);
}

export function useCheckedInAwaitingAssignment() {
  return useSharedDashboardQuery((data) => data.queue.checkedInAwaitingAssignment);
}

export function useLiveQueueBoard() {
  const queryResult = useSharedDashboardQuery((data) => data.queue.liveQueue);

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || 'default';

  const queryResult = useSharedDashboardQuery();

  const refetch = async (): Promise<void> => {
    await revalidateFrontdeskDashboard();
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKey(userId) });
  };

  return {
    data: queryResult.data,
    stats: queryResult.data?.stats ?? EMPTY_STATS,
    todaysSchedule: queryResult.data?.todaysSchedule ?? EMPTY_SCHEDULE,
    queue: queryResult.data?.queue ?? EMPTY_QUEUE,
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
  const { user } = useAuth();
  const userId = user?.id || 'default';

  return useMutation({
    mutationFn: async ({ appointmentId, notes }: { appointmentId: number; notes?: string }) => {
      const response = await frontdeskApi.checkInPatient(appointmentId, { notes });

      if (!response.success) {
        throw new Error(response.error || 'Failed to check in patient');
      }

      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: dashboardQueryKey(userId) });
    },
    onError: () => {
      toast.error('Failed to check in patient');
    },
    onSuccess: (data) => {
      void revalidateFrontdeskDashboard();
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments() });
      const today = new Date().toISOString().split('T')[0];
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.byDate(today) });

      if (data?.doctorId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.doctor.queue(data.doctorId) });
      }

      toast.success('Patient checked in successfully');
    },
  });
}
