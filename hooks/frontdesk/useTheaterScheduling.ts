/**
 * Hooks: useTheaterScheduling
 *
 * React Query hooks for frontdesk theater scheduling operations.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import { queryKeys } from '@/lib/constants/queryKeys';

export interface TheaterSchedulingQueueOptions {
    page?: number;
    limit?: number;
    enabled?: boolean;
}

/**
 * Hook for fetching theater scheduling queue with pagination
 * Returns cases in READY_FOR_THEATER_BOOKING status
 */
export function useTheaterSchedulingQueue(options: TheaterSchedulingQueueOptions = {}) {
    const { page = 1, limit = 20, enabled = true } = options;
    
    return useQuery<TheaterSchedulingResponse, Error>({
        queryKey: queryKeys.frontdesk.theaterQueue(),
        queryFn: async () => {
            const response = await frontdeskApi.getTheaterSchedulingQueue(page, limit);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load theater scheduling queue');
            }
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data;
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60, // 60 seconds - Tier 3 polling
        refetchInterval: 1000 * 60, // Refetch every minute
        refetchOnWindowFocus: false,
        networkMode: 'offlineFirst',
        enabled,
    });
}

/**
 * Hook for fetching theaters with bookings for a specific date
 */
export function useTheaters(date?: string, enabled = true) {
    return useQuery<TheatersResponse, Error>({
        queryKey: queryKeys.frontdesk.theaters(date),
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
        staleTime: 1000 * 60, // 60 seconds
        refetchOnWindowFocus: false,
        networkMode: 'offlineFirst',
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
        onSuccess: () => {
            // Invalidate related queries using standardized keys
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaters() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
            
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
        onSuccess: () => {
            // Invalidate all related queries using standardized keys
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaters() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
            
            toast.success('Theater booking confirmed! Case is now scheduled.');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to confirm theater booking');
        },
    });
}
