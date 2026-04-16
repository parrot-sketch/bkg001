/**
 * Hook: useTheaterBooking
 *
 * Manages theater booking operations for theater tech.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenStorage } from '@/lib/auth/token';
import { ApiResponse, isSuccess } from '@/lib/http/apiResponse';

function getToken(): string | null {
  return tokenStorage.getAccessToken();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TheaterWithBookings {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  hourlyRate: number;
  bookings: TheaterBookingSlot[];
}

export interface TheaterBookingSlot {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  procedure: string;
  startTime: Date;
  endTime: Date;
  status: string;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockExpiresAt: Date | null;
}

interface BookTheaterResponse {
  bookingId: string;
  status: string;
  theaterId: string;
  theaterName: string;
  startTime: string;
  endTime: string;
  lockedAt: string;
  lockExpiresAt: string;
}

interface ConfirmBookingResponse {
  bookingId: string;
  status: string;
  theaterId: string;
  theaterName: string;
  startTime: string;
  endTime: string;
  confirmedAt: string;
  caseStatus: string;
  billing: {
    feeAmount: number;
    durationHours: number;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTheatersApi(date: string): Promise<TheaterWithBookings[]> {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  const res = await fetch(`/api/theater-tech/theater-scheduling/theaters?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<{ theaters: TheaterWithBookings[] }> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to fetch theaters');
  }
  return json.data.theaters;
}

async function bookTheaterSlot(
  caseId: string,
  theaterId: string,
  startTime: string,
  endTime: string
): Promise<BookTheaterResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  const res = await fetch(`/api/theater-tech/theater-scheduling/${caseId}/book`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ theaterId, startTime, endTime }),
  });
  const json: ApiResponse<BookTheaterResponse> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to book theater slot');
  }
  return json.data;
}

async function confirmBooking(caseId: string, bookingId: string): Promise<ConfirmBookingResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  const res = await fetch(`/api/theater-tech/theater-scheduling/${caseId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookingId }),
  });
  const json: ApiResponse<ConfirmBookingResponse> = await res.json();
  if (!isSuccess(json)) {
    throw new Error(json.error || 'Failed to confirm booking');
  }
  return json.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseTheaterBookingOptions {
  caseId: string;
}

export function useTheaterBooking({ caseId }: UseTheaterBookingOptions) {
  const queryClient = useQueryClient();
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Fetch theaters for a date
  const theatersQuery = useMutation<TheaterWithBookings[], Error, string>({
    mutationFn: fetchTheatersApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-theaters'] });
    },
  });

  // Book a slot (provisional lock)
  const bookSlotMutation = useMutation({
    mutationFn: async ({
      theaterId,
      startTime,
      endTime,
    }: {
      theaterId: string;
      startTime: string;
      endTime: string;
    }) => bookTheaterSlot(caseId, theaterId, startTime, endTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-theaters'] });
      queryClient.invalidateQueries({ queryKey: ['theater-tech-case', caseId] });
      setBookingError(null);
    },
    onError: (error: Error) => {
      setBookingError(error.message);
    },
  });

  // Confirm booking
  const confirmMutation = useMutation({
    mutationFn: async (bookingId: string) => confirmBooking(caseId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech-theaters'] });
      queryClient.invalidateQueries({ queryKey: ['theater-tech-case', caseId] });
      setBookingError(null);
    },
    onError: (error: Error) => {
      setBookingError(error.message);
    },
  });

  const fetchTheaters = useCallback(
    (date: string) => theatersQuery.mutateAsync(date),
    [theatersQuery]
  );

  const bookSlot = useCallback(
    (theaterId: string, startTime: string, endTime: string) =>
      bookSlotMutation.mutateAsync({ theaterId, startTime, endTime }),
    [bookSlotMutation]
  );

  const confirm = useCallback(
    (bookingId: string) => confirmMutation.mutateAsync(bookingId),
    [confirmMutation]
  );

  return {
    // Theaters data
    theaters: theatersQuery.data,
    isLoadingTheaters: theatersQuery.isPending,
    theatersError: theatersQuery.error,

    // Booking mutation
    isBooking: bookSlotMutation.isPending,
    bookingData: bookSlotMutation.data,
    bookingError: bookingError || (bookSlotMutation.error ? bookSlotMutation.error.message : null),

    // Confirm mutation
    isConfirming: confirmMutation.isPending,
    confirmData: confirmMutation.data,
    confirmError: confirmMutation.error ? confirmMutation.error.message : null,

    // Actions
    fetchTheaters,
    bookSlot,
    confirm,
  };
}
