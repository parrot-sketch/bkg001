/**
 * Hook: useDoctorAvailableDates
 * 
 * React Query hook for fetching available dates for a doctor.
 * Returns dates that have at least one available slot.
 * Used in booking dialogs to highlight available dates on calendar.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface UseDoctorAvailableDatesOptions {
  doctorId: string | null;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Fetch available dates for a doctor within a date range
 */
export function useDoctorAvailableDates({
  doctorId,
  startDate,
  endDate,
  enabled = true,
}: UseDoctorAvailableDatesOptions) {
  return useQuery({
    queryKey: ['doctor-available-dates', doctorId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!doctorId) {
        return [];
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const url = `/doctors/${doctorId}/available-dates?startDate=${startDateStr}&endDate=${endDateStr}`;
      
      const response = await apiClient.get<string[]>(url);

      if (response.success && response.data) {
        return response.data;
      } else if (!response.success) {
        throw new Error(response.error || 'Failed to fetch available dates');
      } else {
        throw new Error('Failed to fetch available dates');
      }
    },
    enabled: enabled && !!doctorId,
    staleTime: 30 * 1000, // 30 seconds - availability can change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
