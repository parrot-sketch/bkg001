/**
 * Hook: useTheaterSchedulingQueue
 *
 * Theater-tech view of cases in READY_FOR_THEATER_BOOKING.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tokenStorage } from '@/lib/auth/token';
import type { TheaterSchedulingQueueItem } from '@/application/dtos/TheaterSchedulingDtos';
import type { ApiResponse } from '@/lib/http/apiResponse';
import { isSuccess } from '@/lib/http/apiResponse';

export interface TheaterTechSchedulingResponse {
  cases: TheaterSchedulingQueueItem[];
  count: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

async function fetchQueue(page: number, limit: number): Promise<TheaterTechSchedulingResponse> {
  const token = tokenStorage.getAccessToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  const res = await fetch(`/api/theater-tech/theater-scheduling?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json: ApiResponse<TheaterTechSchedulingResponse> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to load theater scheduling queue');
  }

  return json.data;
}

export function useTheaterSchedulingQueue(options?: { page?: number; limit?: number; enabled?: boolean }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const enabled = options?.enabled ?? true;

  return useQuery<TheaterTechSchedulingResponse, Error>({
    queryKey: ['theater-tech', 'theater-scheduling', 'queue', page, limit],
    queryFn: () => fetchQueue(page, limit),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    enabled,
  });
}

