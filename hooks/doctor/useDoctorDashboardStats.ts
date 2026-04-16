/**
 * useDoctorDashboardStats Hook
 * 
 * Aggregates stats for the doctor's dashboard metric cards (Zone 1).
 * Now uses PatientQueue for queue length to match the queue component.
 * 
 * Fetches:
 * - Queue length: patients in PatientQueue with status WAITING
 * - Today's completed consultations: consultations completed today
 * - Active surgical cases: cases not completed/cancelled
 * - Recovery cases pending: cases in RECOVERY status
 * 
 * Used by: Doctor dashboard - Stats Cards (Zone 1)
 * 
 * Polling: 60 seconds (less critical than queue)
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';
import { surgicalCasesApi } from '@/lib/api/surgical-cases';

export interface DoctorDashboardStats {
  queueLength: number;
  completedConsultationsToday: number;
  activeSurgicalCases: number;
  recoveryCases: number;
}

export function useDoctorDashboardStats(doctorId: string | undefined, enabled = true) {
  return useQuery<DoctorDashboardStats>({
    queryKey: ['doctor', doctorId, 'dashboard-stats'],
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }

      // Fetch queue from PatientQueue (matches queue component)
      const queueResponse = await fetch(`/api/doctor/${doctorId}/queue`);
      const queueData = queueResponse.ok ? await queueResponse.json() : [];
      
      // Queue length: count of WAITING patients in PatientQueue
      const queueLength = queueData.length;

      // Fetch today's appointments for completed count
      const appointmentsResponse = await doctorApi.getTodayAppointments(doctorId);
      
      // Fetch surgical cases
      const casesResponse = await surgicalCasesApi.getMyCases({ pageSize: 100 });

      if (!appointmentsResponse.success) {
        throw new Error(appointmentsResponse.error || 'Failed to load appointments');
      }
      if (!casesResponse.success) {
        throw new Error(casesResponse.error || 'Failed to load surgical cases');
      }

      const todayAppointments = appointmentsResponse.data;
      const allCases = casesResponse.data.items;

      // Completed consultations today: COMPLETED status
      const completedConsultationsToday = todayAppointments.filter(
        (apt) => apt.status === 'COMPLETED'
      ).length;

      // Active surgical cases: all non-completed, non-cancelled
      const activeSurgicalCases = allCases.filter(
        (surgicalCase) => 
          surgicalCase.status !== 'COMPLETED' && 
          surgicalCase.status !== 'CANCELLED' &&
          surgicalCase.status !== 'DRAFT'
      ).length;

      // Recovery cases: RECOVERY status
      const recoveryCases = allCases.filter(
        (surgicalCase) => surgicalCase.status === 'RECOVERY'
      ).length;

      return {
        queueLength,
        completedConsultationsToday,
        activeSurgicalCases,
        recoveryCases,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60000, // Poll every 60 seconds
    networkMode: 'offlineFirst',
    enabled: enabled && !!doctorId,
  });
}
