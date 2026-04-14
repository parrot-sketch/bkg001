'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, NotificationResponseDto } from '@/lib/api/notifications';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/constants/queryKeys';

/**
 * Hook for managing user notifications.
 *
 * - Polls every 15 seconds (adaptive: faster when dropdown is open)
 * - Refetches on window focus
 * - Marks data fresh for 10 seconds to avoid redundant refetches
 */
export function useNotifications(userId?: string) {
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
        // Refresh every 60 seconds — non-clinical, no need for aggressive polling
        refetchInterval: 60_000,
        // Consider data fresh for 30 seconds (avoids redundant refetches)
        staleTime: 30_000,
        // Skip window focus refetch — notifications are non-critical
        refetchOnWindowFocus: false,
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
