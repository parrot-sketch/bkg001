import { useQuery } from '@tanstack/react-query';
import { nurseApi, IntraOpCasesResponse } from '@/lib/api/nurse';
import { queryKeys } from '@/lib/constants/queryKeys';

interface UseIntraOpCasesOptions {
  enabled?: boolean;
  /** Override polling. Pass false on inactive dashboard tabs. */
  refetchInterval?: number | false;
}

export function useIntraOpCases(options: UseIntraOpCasesOptions = {}) {
  const { enabled = true, refetchInterval = 60_000 } = options;

  return useQuery<IntraOpCasesResponse, Error>({
    queryKey: queryKeys.nurse.theatreSupport('today'),
    queryFn: async () => {
      const response = await nurseApi.getIntraOpSurgicalCases();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch intra-op cases');
      }
      if (!response.data) {
        throw new Error('No data received');
      }
      return {
        ...response.data,
        cases: response.data.cases.map((c) => ({
          ...c,
          startTime: c.startTime ? new Date(c.startTime) : undefined,
        })),
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    // Was 10s + focus refetch — too aggressive for a few concurrent users on Aiven.
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled,
  });
}
