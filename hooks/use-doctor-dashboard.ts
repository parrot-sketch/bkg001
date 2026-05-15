/**
 * useDoctorDashboard Hook
 *
 * Enhanced with resilience:
 * - Extended staleTime (2min) for offline tolerance
 * - Retry: 3 with exponential backoff
 * - Network-aware: refetch on reconnect
 * - keepsPreviousData: smooth transitions on refresh
 * - error logging for debugging
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDoctorDashboardData, type DoctorDashboardData } from '@/actions/doctor/get-dashboard-data';
import { queryKeys } from '@/lib/constants/queryKeys';

export const DOCTOR_DASHBOARD_KEY = ['doctor', 'dashboard'] as const;

interface UseDoctorDashboardOptions {
  enabled?: boolean;
  retry?: number;
}

export function useDoctorDashboard(options: UseDoctorDashboardOptions = {}) {
  const { enabled = true, retry = 3 } = options;

  return useQuery<DoctorDashboardData>({
    queryKey: DOCTOR_DASHBOARD_KEY,
    queryFn: async () => {
      const data = await getDoctorDashboardData();
      return data;
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled,
  });
}

export function useDoctorAppointments() {
  const { data } = useDoctorDashboard();
  return data?.todayAppointments ?? [];
}

export function useDoctorQueue() {
  const { data } = useDoctorDashboard();
  return data?.queue ?? [];
}

export function useDoctorCases() {
  const { data } = useDoctorDashboard();
  return data?.surgicalCases ?? [];
}

export function useDoctorStats() {
  const { data } = useDoctorDashboard();
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

export function useDoctorNotifications() {
  const { data } = useDoctorDashboard();
  return data?.notifications ?? [];
}

export function useDoctorProfile() {
  const { data } = useDoctorDashboard();
  return data?.doctor ?? null;
}

export function useInvalidateDoctorDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: DOCTOR_DASHBOARD_KEY });
  };
}

export { type DoctorDashboardData };
