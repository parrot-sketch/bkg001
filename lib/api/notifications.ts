import { apiClient, ApiResponse } from './client';

export interface NotificationResponseDto {
    id: number;
    user_id: string;
    sender_id: string | null;
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
    subject: string | null;
    message: string;
    metadata: string | null;
    sent_at: string | null;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * API client for notification-related operations.
 */
export const notificationsApi = {
    /**
     * Fetches current user's notifications.
     */
    async getNotifications(): Promise<ApiResponse<NotificationResponseDto[]>> {
        return apiClient.get<NotificationResponseDto[]>('/notifications');
    },

    /**
     * Marks a specific notification as read.
     */
    async markAsRead(id: number): Promise<ApiResponse<NotificationResponseDto>> {
        return apiClient.post<NotificationResponseDto>(`/notifications/${id}/read`, {});
    },

    /**
     * Marks all notifications as read.
     */
    async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
        return apiClient.post<{ count: number }>('/notifications/read-all', {});
    },
};
