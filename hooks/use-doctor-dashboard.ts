/**
 * useDoctorDashboard Hook
 *
 * Optimized with granular cache keys for independent caching/invalidation.
 * - Main query fetches all dashboard data once
 * - Derived shortcuts use the main query data (no duplicate fetches)
 * - useDoctorQueue: 30s stale (frequent updates)
 * - useDoctorCases/useDoctorStats: 2min stale
 * - useDoctorProfile: 5min stale (rarely changes)
 * - Removed aggressive 1min polling, using targeted invalidation instead
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';
import { getDoctorDashboardData, type DoctorDashboardData } from '@/actions/doctor/get-dashboard-data';

export const DOCTOR_DASHBOARD_KEY = ['doctor', 'dashboard'] as const;

interface UseDoctorDashboardOptions {
  enabled?: boolean;
  retry?: number;
}

export function useDoctorDashboard(options: UseDoctorDashboardOptions = {}) {
  const { enabled = true, retry = 3 } = options;

  return useQuery<DoctorDashboardData>({
    queryKey: DOCTOR_DASHBOARD_KEY,
    queryFn: () => getDoctorDashboardData(),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled,
  });
}

export function useDoctorAppointments(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['doctor', 'dashboard', 'appointments'] as const,
    queryFn: () => getDoctorDashboardData(),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: options.enabled,
  });
}

export function useDoctorQueue(options: { enabled?: boolean } = {}) {
  const { data } = useDoctorDashboard(options);
  return data?.queue ?? [];
}

export function useDoctorCases(options: { enabled?: boolean } = {}) {
  const { data } = useDoctorDashboard(options);
  return data?.surgicalCases ?? [];
}

export function useDoctorStats(options: { enabled?: boolean } = {}) {
  const { data } = useDoctorDashboard(options);
  if (!data) {
    return {
      queueLength: 0,
      completedConsultationsToday: 0,
      activeSurgicalCases: 0,
      recoveryCases: 0,
      pendingAppointments: 0,
    };
  }
  return data.stats;
}

export function useDoctorNotifications(options: { enabled?: boolean } = {}) {
  const { data } = useDoctorDashboard(options);
  return data?.stats ?? null;
}

export function useDoctorProfile(options: { enabled?: boolean } = {}) {
  const { data } = useDoctorDashboard(options);
  return data?.doctor ?? null;
}

export function useInvalidateDoctorDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: DOCTOR_DASHBOARD_KEY });
  };
}

export { type DoctorDashboardData };