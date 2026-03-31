import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { PatientStatsDto } from '@/application/dtos/PatientRegistryDto';

export function usePatientStats() {
  return useQuery({
    queryKey: ['frontdesk', 'patient-stats'],
    queryFn: async () => {
      const result = await apiClient.get<PatientStatsDto>('/frontdesk/patients/stats');

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 5 * 60_000,
  });
}
