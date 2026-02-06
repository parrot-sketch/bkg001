'use client';

/**
 * Enhanced NotificationItem Component
 * 
 * Features:
 * - Type-based icons and colors
 * - Rich visual hierarchy
 * - Hover effects
 * - Unread indicator
 * - Relative timestamps
 */

import { Calendar, UserCheck, XCircle, Clock, AlertCircle, CheckCircle, Info, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
    notification: any;
    onClick: () => void;
}

// Get icon based on notification type
function getNotificationIcon(type: string) {
    const iconMap: Record<string, any> = {
        'APPOINTMENT_SCHEDULED': Calendar,
        'APPOINTMENT_CONFIRMED': CheckCircle,
        'APPOINTMENT_CANCELLED': XCircle,
        'APPOINTMENT_REMINDER': Clock,
        'APPOINTMENT_RESCHEDULED': Calendar,
        'PATIENT_CHECKED_IN': UserCheck,
        'URGENT': AlertCircle,
        'INFO': Info,
    };

    const IconComponent = iconMap[type] || Bell;
    return <IconComponent className="h-5 w-5" />;
}

// Get color scheme based on notification type
function getNotificationColor(type: string) {
    const colorMap: Record<string, string> = {
        'APPOINTMENT_SCHEDULED': 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        'APPOINTMENT_CONFIRMED': 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
        'APPOINTMENT_CANCELLED': 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
        'APPOINTMENT_REMINDER': 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        'APPOINTMENT_RESCHEDULED': 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
        'PATIENT_CHECKED_IN': 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        'URGENT': 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
        'INFO': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return colorMap[type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isUnread = notification.status === 'UNREAD';

    // Safely parse the date
    const createdAt = notification.createdAt ? new Date(notification.createdAt) : new Date();
    const isValidDate = !isNaN(createdAt.getTime());

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-all border-l-2 group",
                isUnread
                    ? "bg-primary/5 border-l-primary"
                    : "border-l-transparent hover:border-l-muted"
            )}
        >
            {/* Icon */}
            <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                getNotificationColor(notification.type)
            )}>
                {getNotificationIcon(notification.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm line-clamp-2",
                    isUnread ? "font-semibold" : "font-medium"
                )}>
                    {notification.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {notification.message}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                    <span className="text-xs text-muted-foreground/70">
                        {isValidDate ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'Just now'}
                    </span>
                </div>
            </div>

            {/* Unread indicator */}
            {isUnread && (
                <div className="flex items-start pt-1">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 shadow-sm" />
                </div>
            )}
        </div>
    );
}
