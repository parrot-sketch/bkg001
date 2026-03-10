import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

/**
 * Hook for fetching all appointments (Admin view)
 */
export function useAllAppointments(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'appointments'],
    queryFn: async () => {
      const response = await adminApi.getAllAppointments();
      if (!response.success) throw new Error(response.error || 'Failed to load appointments');
      return response.data ?? [];
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for cancelling an appointment (admin)
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminApi.cancelAppointment(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] }),
  });
}
