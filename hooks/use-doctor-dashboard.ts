/**
 * useDoctorDashboard Hook
 * 
 * Unified React Query hook for doctor dashboard data.
 * Provides single source of truth for all dashboard components.
 * 
 * Query Configuration:
 * - staleTime: 30 seconds (matches server-side cache)
 * - refetchInterval: 60 seconds (single polling source)
 * - refetchOnWindowFocus: true (clinical safety)
 * - retry: 2
 * 
 * Selector hooks allow components to subscribe to specific data slices
 * without additional fetches - all share the same cache entry.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDoctorDashboardData, type DoctorDashboardData } from '@/actions/doctor/get-dashboard-data';
import { queryKeys } from '@/lib/constants/queryKeys';

export const DOCTOR_DASHBOARD_KEY = ['doctor', 'dashboard'] as const;

interface UseDoctorDashboardOptions {
  enabled?: boolean;
}

export function useDoctorDashboard(options: UseDoctorDashboardOptions = {}) {
  const { enabled = true } = options;
  
  return useQuery<DoctorDashboardData>({
    queryKey: DOCTOR_DASHBOARD_KEY,
    queryFn: async () => {
      const data = await getDoctorDashboardData();
      return data;
    },
    staleTime: 5_000,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled,
  });
}

export function useDoctorAppointments() {
  const { data } = useDoctorDashboard();
  return data?.appointments ?? [];
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