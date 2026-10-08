'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, NotificationResponseDto } from '@/lib/api/notifications';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/constants/queryKeys';

interface UseNotificationsOptions {
    /** Poll interval; front desk uses a shorter one so new intakes surface quickly. */
    pollIntervalMs?: number;
}

/**
 * Hook for managing user notifications.
 *
 * - Polls every 60 seconds by default (configurable per caller)
 * - Marks data fresh for half the poll interval to avoid redundant refetches
 */
export function useNotifications(userId?: string, options: UseNotificationsOptions = {}) {
    const pollIntervalMs = options.pollIntervalMs ?? 60_000;
    const queryClient = useQueryClient();

    // Fetch notifications
    const {
        data: notifications = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: userId ? queryKeys.notifications.unread() : queryKeys.notifications.unread(),
        queryFn: async () => {
            const response = await notificationsApi.getNotifications();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch notifications');
            }
            return response.data;
        },
        refetchInterval: pollIntervalMs,
        // Keep polling when the tab is in the background so the alert chime still plays.
        refetchIntervalInBackground: pollIntervalMs < 60_000,
        staleTime: pollIntervalMs / 2,
        refetchOnWindowFocus: pollIntervalMs < 60_000,
        // Keep previous data while refetching for smoother UX
        placeholderData: (previousData) => previousData,
    });

    // Mark single notification as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (id: number) => notificationsApi.markAsRead(id),
        onSuccess: (response) => {
            if (!response.success) {
                toast.error(response.error || 'Failed to mark notification as read');
                return;
            }
            // Invalidate and refetch to update UI - cross-module
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
            queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.notifications(userId || 'default') });
        },
        onError: (error) => {
            console.error('Error marking notification as read:', error);
            toast.error('Failed to mark notification as read');
        },
    });

    // Mark all notifications as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: (response) => {
            if (!response.success) {
                toast.error(response.error || 'Failed to mark all notifications as read');
                return;
            }
            // Invalidate and refetch to update UI - cross-module
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
            queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
            queryClient.invalidateQueries({ queryKey: queryKeys.nurse.notifications(userId || 'default') });
        },
        onError: (error) => {
            console.error('Error marking all notifications as read:', error);
            toast.error('Failed to mark all notifications as read');
        },
    });

    const unreadCount = notifications.filter(n => n.status !== 'READ').length;

    return {
        notifications,
        unreadCount,
        loading: isLoading,
        error,
        refetch,
        markAsRead: markAsReadMutation.mutate,
        isMarkingAsRead: markAsReadMutation.isPending,
        markAllAsRead: markAllAsReadMutation.mutate,
        isMarkingAllAsRead: markAllAsReadMutation.isPending,
    };
}
