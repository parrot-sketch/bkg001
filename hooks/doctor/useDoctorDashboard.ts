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
      // AND filter out passed appointments (60-minute grace period)
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      return response.data.filter((apt) => {
        // Basic status filter
        const isActionableStatus =
          apt.status === AppointmentStatus.SCHEDULED ||
          apt.status === AppointmentStatus.CONFIRMED ||
          apt.status === AppointmentStatus.CHECKED_IN ||
          apt.status === AppointmentStatus.READY_FOR_CONSULTATION ||
          apt.status === AppointmentStatus.IN_CONSULTATION;

        if (!isActionableStatus) return false;

        // Time-based relevance filter
        // Skip time check for patients already checked in or in consultation
        // We want to see them regardless of lateness if they are here
        if (
          apt.status === AppointmentStatus.CHECKED_IN ||
          apt.status === AppointmentStatus.READY_FOR_CONSULTATION ||
          apt.status === AppointmentStatus.IN_CONSULTATION
        ) {
          return true;
        }

        try {
          // Time format is typically HH:mm
          const [aptHours, aptMinutes] = apt.time.split(':').map(Number);

          if (!isNaN(aptHours) && !isNaN(aptMinutes)) {
            const aptTotalMinutes = aptHours * 60 + aptMinutes;
            const nowTotalMinutes = currentHours * 60 + currentMinutes;

            // Allow 60 minutes grace period for late starts
            // If it started more than 60 mins ago, it's likely done or missed for the dashboard view
            return (aptTotalMinutes + 60) > nowTotalMinutes;
          }
        } catch (e) {
          console.error('Error parsing appointment time:', apt.time);
        }

        return true;
      });
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

/**
 * Hook for fetching appointments pending doctor confirmation
 * 
 * Used by: Doctor dashboard - Pending Confirmations section
 * 
 * These are appointments booked by frontdesk that require the doctor's
 * confirmation before they become active.
 * 
 * @param doctorId - Doctor user ID
 * @param enabled - Whether the query should run (default: true)
 */
export function useDoctorPendingConfirmations(doctorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['doctor', doctorId, 'appointments', 'pending-confirmations'],
    queryFn: async () => {
      if (!doctorId) {
        throw new Error('Doctor ID is required');
      }
      // Request pending confirmation appointments specifically
      const response = await doctorApi.getAppointments(
        doctorId,
        AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        true // Include all (don't filter by date range)
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pending confirmations');
      }
      // Sort by date - soonest first
      return response.data.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate}T${a.time}`);
        const dateB = new Date(`${b.appointmentDate}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
    },
    staleTime: 1000 * 30, // 30 seconds - needs to be fresh for action items
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch on focus since these are action items
    refetchOnReconnect: true,
    enabled: enabled && !!doctorId,
  });
}
