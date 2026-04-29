/**
 * Hook: useTheaterSchedule
 *
 * Theater-tech schedule view (bookings by date).
 * Uses the existing theaters+bookings endpoint for the selected date.
 */

import { useQuery } from '@tanstack/react-query';
import { tokenStorage } from '@/lib/auth/token';
import type { ApiResponse } from '@/lib/http/apiResponse';
import { isSuccess } from '@/lib/http/apiResponse';

export interface TheaterScheduleBookingSlot {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  procedure: string;
  startTime: string;
  endTime: string;
  status: string;
  lockedBy: string | null;
  lockedAt: string | null;
  lockExpiresAt: string | null;
}

export interface TheaterScheduleTheater {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  hourlyRate: number;
  bookings: TheaterScheduleBookingSlot[];
}

export interface TheaterScheduleResponse {
  theaters: TheaterScheduleTheater[];
  date: string;
}

async function fetchSchedule(date: string): Promise<TheaterScheduleResponse> {
  const token = tokenStorage.getAccessToken();
  if (!token) throw new Error('No authentication token available');

  const res = await fetch(`/api/theater-tech/theater-scheduling/theaters?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<{ theaters: TheaterScheduleTheater[]; date: string }> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to load theater schedule');
  }
  return json.data;
}

export const theaterScheduleKeys = {
  all: ['theater-tech', 'theater-schedule'] as const,
  byDate: (date: string) => [...theaterScheduleKeys.all, date] as const,
};

export function useTheaterSchedule(date: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery<TheaterScheduleResponse, Error>({
    queryKey: theaterScheduleKeys.byDate(date),
    queryFn: () => fetchSchedule(date),
    staleTime: 1000 * 30,
    refetchInterval: enabled ? 1000 * 30 : false,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    enabled: enabled && !!date,
  });
}

