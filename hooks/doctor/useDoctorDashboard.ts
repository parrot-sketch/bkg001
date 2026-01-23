/**
 * useDoctorDashboard Hooks
 * 
 * React Query hooks for doctor dashboard data.
 * 
 * REFACTORED FROM: Manual useState/useEffect fetch in app/doctor/dashboard/page.tsx
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 * 
 * Caching Strategy:
 * - Dashboard data: 30 seconds staleTime (moderate freshness for clinical workflows)
 * - Automatic background refetch on window focus for clinical safety
 */

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api/doctor';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

/**
 * Hook for fetching today's appointments for a doctor
 * 
 * Used by: Doctor dashboard
 * 
 * @param doctorId - Doctor user ID
 * @param enabled - Whether the query should run (default: true)
 */
export function useDoctorTodayAppointments(doctorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['doctor', doctorId, 'appointments', 'today'],
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }
      const response = await doctorApi.getTodayAppointments(doctorId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load today\'s appointments');
      }
      // Filter to only show CONFIRMED and SCHEDULED sessions
      // Surgeon never sees SUBMITTED, PENDING_REVIEW, NEEDS_MORE_INFO
      return response.data.filter(
        (apt) => apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.CONFIRMED
      );
    },
    staleTime: 1000 * 30, // 30 seconds - moderate freshness for clinical workflows
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch on focus for clinical safety
    refetchOnReconnect: true,
    enabled: enabled && !!doctorId,
  });
}

/**
 * Hook for fetching upcoming appointments for a doctor
 * 
 * Used by: Doctor dashboard
 * 
 * @param doctorId - Doctor user ID
 * @param enabled - Whether the query should run (default: true)
 */
export function useDoctorUpcomingAppointments(doctorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['doctor', doctorId, 'appointments', 'upcoming'],
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }
      const response = await doctorApi.getUpcomingAppointments(doctorId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load upcoming appointments');
      }
      // Filter to only show CONFIRMED and SCHEDULED sessions
      return response.data.filter(
        (apt) => apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.CONFIRMED
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    enabled: enabled && !!doctorId,
  });
}
