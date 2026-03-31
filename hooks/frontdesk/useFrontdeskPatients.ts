import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/constants/queryKeys';
import type { PatientRegistryDto, PatientListMeta } from '@/application/dtos/PatientRegistryDto';

interface UseFrontdeskPatientsProps {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}

export function useFrontdeskPatients({
  page,
  limit,
  search,
  enabled = true,
}: UseFrontdeskPatientsProps) {
  return useQuery({
    queryKey: queryKeys.frontdesk.patients({ page, limit, search }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('q', search);

      const result = await apiClient.get(`/frontdesk/patients?${params.toString()}`);

      if (!result.success) {
        throw new Error(result.error);
      }

      // The API returns { success: true, data: [...patients], meta: {...} }
      // apiClient wraps it as ApiSuccess, so result = { success: true, data: [...patients], meta: {...} }
      // We need both the patients array AND the meta — return them explicitly.
      const raw = result as unknown as {
        data: PatientRegistryDto[];
        meta: PatientListMeta;
      };

      return {
        data: raw.data,
        meta: raw.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled,
  });
}
