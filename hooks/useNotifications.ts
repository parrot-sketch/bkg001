'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, NotificationResponseDto } from '@/lib/api/notifications';
import { toast } from 'sonner';

/**
 * Hook for managing user notifications.
 */
export function useNotifications() {
    const queryClient = useQueryClient();

    // Fetch notifications
    const {
        data: notifications = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await notificationsApi.getNotifications();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch notifications');
            }
            return response.data;
        },
        // Refresh every 30 seconds
        refetchInterval: 30000,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (id: number) => notificationsApi.markAsRead(id),
        onSuccess: (response) => {
            if (!response.success) {
                toast.error(response.error || 'Failed to mark notification as read');
                return;
            }
            // Invalidate and refetch to update UI
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (error) => {
            console.error('Error marking notification as read:', error);
            toast.error('Failed to mark notification as read');
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
    };
}
