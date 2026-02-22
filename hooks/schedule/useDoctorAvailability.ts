/**
 * Shared React Query Hooks for Doctor Availability
 * 
 * Provides centralized data fetching and caching for doctor availability
 * across the application. Prevents duplicate API calls when navigating
 * between dashboard and booking wizard.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { apiClient } from '@/lib/api/client';
import { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import type { AvailableSlotResponseDto } from '@/application/dtos/AvailableSlotResponseDto';
import { addMonths, endOfMonth } from 'date-fns';

/**
 * Query key factory for doctor availability queries
 * Ensures consistent cache keys across components
 */
export const doctorAvailabilityKeys = {
  all: ['doctors', 'availability'] as const,
  lists: () => [...doctorAvailabilityKeys.all, 'list'] as const,
  list: (startDate: Date, endDate: Date) => 
    [...doctorAvailabilityKeys.lists(), startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]] as const,
  details: () => [...doctorAvailabilityKeys.all, 'detail'] as const,
  detail: (doctorId: string) => [...doctorAvailabilityKeys.details(), doctorId] as const,
  availableDates: (doctorId: string, startDate: Date, endDate: Date) =>
    [...doctorAvailabilityKeys.detail(doctorId), 'available-dates', startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]] as const,
  slots: (doctorId: string, date: string) =>
    [...doctorAvailabilityKeys.detail(doctorId), 'slots', date] as const,
};

/**
 * Hook to fetch all doctors' availability for a date range
 * Used by AvailableDoctorsPanel on dashboard
 */
export function useDoctorsAvailability(
  startDate: Date,
  endDate: Date,
  options?: Omit<UseQueryOptions<DoctorAvailabilityResponseDto[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DoctorAvailabilityResponseDto[], Error>({
    queryKey: doctorAvailabilityKeys.list(startDate, endDate),
    queryFn: async (): Promise<DoctorAvailabilityResponseDto[]> => {
      const response = await frontdeskApi.getDoctorsAvailability(startDate, endDate);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load doctor availability');
      }
      
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Hook to fetch available dates for a specific doctor
 * Reuses data from useDoctorsAvailability if available
 */
export function useDoctorAvailableDates(
  doctorId: string,
  startDate: Date,
  endDate: Date,
  options?: Omit<UseQueryOptions<string[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<string[], Error>({
    queryKey: doctorAvailabilityKeys.availableDates(doctorId, startDate, endDate),
    queryFn: async (): Promise<string[]> => {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const response = await apiClient.get<string[]>(
        `/doctors/${doctorId}/available-dates?startDate=${startStr}&endDate=${endStr}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Failed to load available dates');
      }
      
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!doctorId,
    ...options,
  });
}

/**
 * Hook to fetch available slots for a specific doctor on a specific date
 */
export function useDoctorAvailableSlots(
  doctorId: string,
  date: string, // YYYY-MM-DD
  options?: Omit<UseQueryOptions<AvailableSlotResponseDto[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AvailableSlotResponseDto[], Error>({
    queryKey: doctorAvailabilityKeys.slots(doctorId, date),
    queryFn: async (): Promise<AvailableSlotResponseDto[]> => {
      const response = await apiClient.get<AvailableSlotResponseDto[]>(
        `/doctors/${doctorId}/slots?date=${date}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Failed to load available slots');
      }
      
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (slots change more frequently)
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!doctorId && !!date,
    ...options,
  });
}

/**
 * Hook to get a specific doctor's availability from the cached list
 * This avoids making a new API call if we already have the data
 */
export function useDoctorFromAvailabilityList(
  doctorId: string | undefined,
  startDate: Date,
  endDate: Date
) {
  const { data: allDoctors, ...rest } = useDoctorsAvailability(startDate, endDate, {
    enabled: !!doctorId, // Only fetch if we have a doctorId
  });

  const doctor = doctorId 
    ? allDoctors?.find(d => d.doctorId === doctorId)
    : undefined;

  return {
    doctor,
    ...rest,
  };
}

/**
 * Helper to get default date range (next 2 months)
 * Used consistently across components
 */
export function getDefaultAvailabilityDateRange() {
  const today = new Date();
  const endDate = endOfMonth(addMonths(today, 2));
  return { startDate: today, endDate };
}
