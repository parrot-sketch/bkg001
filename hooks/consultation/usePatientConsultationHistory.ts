/**
 * React Query Hook: usePatientConsultationHistory
 * 
 * Fetches patient consultation history for timeline UI.
 * 
 * Note: Requires @tanstack/react-query to be installed.
 */

import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '@/lib/api/consultation';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';

/**
 * Hook to fetch patient consultation history
 */
export function usePatientConsultationHistory(patientId: string | null) {
  return useQuery<PatientConsultationHistoryDto, Error>({
    queryKey: ['patient-consultations', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('Patient ID is required');
      
      const response = await consultationApi.getPatientConsultationHistory(patientId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch consultation history');
      }
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes (history changes less frequently)
    retry: 2,
  });
}
