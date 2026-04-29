/**
 * Hook: useTheaterBookingActions
 *
 * Mutations for schedule actions (cancel / reschedule).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenStorage } from '@/lib/auth/token';
import type { ApiResponse } from '@/lib/http/apiResponse';
import { isSuccess } from '@/lib/http/apiResponse';
import { theaterScheduleKeys } from '@/hooks/theater-tech/useTheaterSchedule';

type CancelResult = {
  bookingId: string;
  status: string;
  caseId: string;
  caseStatus: string;
  billingReversed: boolean;
  reversedAmount: number;
};

type RescheduleResult = {
  bookingId: string;
  status: string;
  theaterId: string;
  theaterName: string;
  startTime: string;
  endTime: string;
  rescheduledAt: string;
  caseId: string;
  caseStatus: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const token = tokenStorage.getAccessToken();
  if (!token) throw new Error('No authentication token available');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json: ApiResponse<T> = await res.json();
  if (!isSuccess(json)) throw new Error(json.error || 'Request failed');
  return json.data;
}

export function useTheaterBookingActions() {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (args: { bookingId: string; reason?: string }) => {
      return postJson<CancelResult>(
        `/api/theater-tech/theater-scheduling/bookings/${args.bookingId}/cancel`,
        { reason: args.reason },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: theaterScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theater-scheduling', 'queue'] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (args: { bookingId: string; theaterId: string; startTime: string; endTime: string; reason?: string }) => {
      return postJson<RescheduleResult>(
        `/api/theater-tech/theater-scheduling/bookings/${args.bookingId}/reschedule`,
        { theaterId: args.theaterId, startTime: args.startTime, endTime: args.endTime, reason: args.reason },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: theaterScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theater-scheduling', 'theaters'] });
    },
  });

  return {
    cancelBooking: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,

    rescheduleBooking: rescheduleMutation.mutateAsync,
    isRescheduling: rescheduleMutation.isPending,
    rescheduleError: rescheduleMutation.error,
  };
}

