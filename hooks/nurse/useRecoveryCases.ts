import { useQuery } from '@tanstack/react-query';
import { nurseApi, RecoveryCasesResponse } from '@/lib/api/nurse';
import { queryKeys } from '@/lib/constants/queryKeys';

interface UseRecoveryCasesOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useRecoveryCases(options: UseRecoveryCasesOptions = {}) {
  const { enabled = true, refetchInterval = 60_000 } = options;

  return useQuery<RecoveryCasesResponse, Error>({
    queryKey: queryKeys.nurse.recovery(),
    queryFn: async () => {
      const response = await nurseApi.getRecoverySurgicalCases();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recovery cases');
      }
      if (!response.data) {
        throw new Error('No data received');
      }
      return response.data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst',
    enabled,
  });
}
