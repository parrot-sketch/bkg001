import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

/**
 * Fetch pre-op (upcoming scheduled/pending) appointments
 */
export function usePreOpAppointments(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'pre-op'],
    queryFn: async () => {
      const response = await adminApi.getPreOpOverview();
      if (!response.success) throw new Error(response.error || 'Failed to load pre-op data');
      return response.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Fetch post-op (completed, last 30 days) appointments
 */
export function usePostOpAppointments(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'post-op'],
    queryFn: async () => {
      const response = await adminApi.getPostOpOverview();
      if (!response.success) throw new Error(response.error || 'Failed to load post-op data');
      return response.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled,
  });
}
