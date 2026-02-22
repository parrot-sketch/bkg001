/**
 * Hooks: useTheaterScheduling
 *
 * React Query hooks for frontdesk theater scheduling operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    frontdeskApi,
    TheaterSchedulingResponse,
    TheatersResponse,
    BookTheaterRequest,
    BookTheaterResponse,
    ConfirmBookingRequest,
    ConfirmBookingResponse,
} from '@/lib/api/frontdesk';

/**
 * Query keys for theater scheduling
 */
export const theaterSchedulingKeys = {
    all: ['frontdesk', 'theater-scheduling'] as const,
    queue: () => [...theaterSchedulingKeys.all, 'queue'] as const,
    theaters: (date?: string) => [...theaterSchedulingKeys.all, 'theaters', date] as const,
    case: (caseId: string) => [...theaterSchedulingKeys.all, 'case', caseId] as const,
};

/**
 * Hook for fetching theater scheduling queue
 * Returns cases in READY_FOR_THEATER_BOOKING status
 */
export function useTheaterSchedulingQueue(enabled = true) {
    return useQuery<TheaterSchedulingResponse, Error>({
        queryKey: theaterSchedulingKeys.queue(),
        queryFn: async () => {
            const response = await frontdeskApi.getTheaterSchedulingQueue();
            if (!response.success) {
                throw new Error(response.error || 'Failed to load theater scheduling queue');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute
        enabled,
    });
}

/**
 * Hook for fetching theaters with bookings for a specific date
 */
export function useTheaters(date?: string, enabled = true) {
    return useQuery<TheatersResponse, Error>({
        queryKey: theaterSchedulingKeys.theaters(date),
        queryFn: async () => {
            const response = await frontdeskApi.getTheaters(date);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load theaters');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        staleTime: 1000 * 15, // 15 seconds
        enabled,
    });
}

/**
 * Hook for booking theater (locking slot)
 */
export function useBookTheater(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation<BookTheaterResponse, Error, BookTheaterRequest>({
        mutationFn: async (request) => {
            const response = await frontdeskApi.bookTheater(caseId, request);
            if (!response.success) {
                throw new Error(response.error || 'Failed to book theater slot');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: theaterSchedulingKeys.queue() });
            queryClient.invalidateQueries({ queryKey: theaterSchedulingKeys.theaters() });
            queryClient.invalidateQueries({ queryKey: theaterSchedulingKeys.case(caseId) });
            
            toast.success('Theater slot locked. Please confirm to complete booking.');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to lock theater slot');
        },
    });
}

/**
 * Hook for confirming theater booking
 */
export function useConfirmBooking(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation<ConfirmBookingResponse, Error, ConfirmBookingRequest>({
        mutationFn: async (request) => {
            const response = await frontdeskApi.confirmBooking(caseId, request);
            if (!response.success) {
                throw new Error(response.error || 'Failed to confirm theater booking');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: theaterSchedulingKeys.all });
            
            toast.success('Theater booking confirmed! Case is now scheduled.');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to confirm theater booking');
        },
    });
}
