/**
 * Hook: useDayboard
 *
 * Fetches and manages dayboard data with React Query.
 */

import { useQuery } from '@tanstack/react-query';
import type { DayboardDto } from '@/application/dtos/TheaterTechDtos';
import { ApiResponse, isSuccess } from '@/lib/http/apiResponse';
import { tokenStorage } from '@/lib/auth/token';

function getToken(): string | null {
  return tokenStorage.getAccessToken();
}

async function fetchDayboard(date: string, theaterId?: string): Promise<DayboardDto> {
  const token = getToken();
  const params = new URLSearchParams({ date });
  if (theaterId) params.set('theaterId', theaterId);
  const res = await fetch(`/api/theater-tech/dayboard?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<DayboardDto> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to fetch dayboard');
  }
  return json.data;
}

export function useDayboard(date: string, theaterId?: string) {
  return useQuery<DayboardDto>({
    queryKey: ['theater-tech-dayboard', date, theaterId || ''],
    queryFn: () => fetchDayboard(date, theaterId),
    refetchInterval: 30_000,
    staleTime: 10_000,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}
