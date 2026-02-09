/**
 * useDoctorProfile Hooks
 *
 * React Query hooks for the doctor's own profile page.
 *
 * Caching strategy:
 * - Profile & availability: 5 min staleTime (rarely changes)
 * - Appointments: 2 min staleTime (changes more often)
 *
 * On subsequent navigations React Query serves instantly from cache,
 * then revalidates in the background — eliminating the loading skeleton.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { doctorApi } from '@/lib/api/doctor';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const doctorProfileKeys = {
  profile: ['doctor', 'me', 'profile'] as const,
  availability: ['doctor', 'me', 'availability'] as const,
  appointments: (doctorId: string) =>
    ['doctor', doctorId, 'profile-appointments'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated doctor's profile via /api/doctors/me/profile
 */
export function useDoctorMyProfile() {
  return useQuery({
    queryKey: doctorProfileKeys.profile,
    queryFn: async () => {
      const response = await apiClient.get<any>('/doctors/me/profile');
      if (!response.success) {
        throw new Error(response.error || 'Failed to load profile');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — profile rarely changes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch the authenticated doctor's availability via /api/doctors/me/availability
 */
export function useDoctorMyAvailability() {
  return useQuery({
    queryKey: doctorProfileKeys.availability,
    queryFn: async () => {
      const response = await doctorApi.getMyAvailability();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load availability');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch the doctor's appointments (all statuses, history + upcoming).
 * Enabled only when doctorId is available (depends on profile query).
 */
export function useDoctorMyAppointments(doctorId: string | undefined) {
  return useQuery({
    queryKey: doctorProfileKeys.appointments(doctorId || ''),
    queryFn: async () => {
      if (!doctorId) throw new Error('Doctor ID required');
      const response = await doctorApi.getAppointments(
        doctorId,
        undefined,
        true, // includeAll
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointments');
      }
      return response.data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!doctorId,
  });
}

// ─── Cache Invalidation ─────────────────────────────────────────────────────

/**
 * Returns helpers to invalidate cached doctor profile data after mutations
 * (e.g. after editing profile, updating availability).
 */
export function useInvalidateDoctorProfile() {
  const queryClient = useQueryClient();
  return {
    invalidateProfile: () =>
      queryClient.invalidateQueries({ queryKey: doctorProfileKeys.profile }),
    invalidateAvailability: () =>
      queryClient.invalidateQueries({
        queryKey: doctorProfileKeys.availability,
      }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: doctorProfileKeys.profile });
      queryClient.invalidateQueries({
        queryKey: doctorProfileKeys.availability,
      });
    },
  };
}
