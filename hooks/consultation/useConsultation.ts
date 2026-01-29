/**
 * React Query Hook: useConsultation
 * 
 * Fetches consultation details for active session UI.
 * 
 * Note: Requires @tanstack/react-query to be installed.
 * Run: npm install @tanstack/react-query
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/lib/api/consultation';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

/**
 * Hook to fetch consultation by appointment ID
 */
export function useConsultation(appointmentId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery<ConsultationResponseDto | null, Error>({
    queryKey: ['consultation', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;

      const response = await consultationApi.getConsultation(appointmentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch consultation');
      }
      return response.data;
    },
    enabled: !!appointmentId,
    staleTime: 0, // Always fresh during active consultation
    // DISABLED: This was causing version conflicts by resetting the version token every 30s
    // refetchInterval: (query) => {
    //   // Poll every 30s if consultation is active
    //   const consultation = query.state.data;
    //   const isActive = consultation?.state === ConsultationState.IN_PROGRESS;
    //   return isActive ? 30000 : false;
    // },
    // refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Derived state
  const isConsultationActive = query.data?.state === ConsultationState.IN_PROGRESS;
  const canSaveDraft = isConsultationActive;
  const canComplete = isConsultationActive;
  const isCompleted = query.data?.state === ConsultationState.COMPLETED;
  const isNotStarted = !query.data || query.data.state === ConsultationState.NOT_STARTED;

  return {
    ...query,
    consultation: query.data,
    isConsultationActive,
    canSaveDraft,
    canComplete,
    isCompleted,
    isNotStarted,
  };
}
