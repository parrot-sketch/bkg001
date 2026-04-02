'use client';

/**
 * Enhanced NotificationItem Component
 * 
 * Features:
 * - Type-based icons and colors
 * - Rich visual hierarchy
 * - Hover effects
 * - Unread indicator
 * - Live-updating relative timestamps (refreshes every 30s)
 */

import { Calendar, UserCheck, XCircle, Clock, AlertCircle, CheckCircle, Info, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

interface NotificationItemProps {
    notification: any;
    onClick: () => void;
}

/**
 * Returns the appropriate refresh interval based on how old the date is.
 * - Under 1 hour: refresh every 30 seconds
 * - Under 24 hours: refresh every 5 minutes
 * - Older: no refresh needed
 */
function getRefreshInterval(date: Date): number | null {
    const ageMs = Date.now() - date.getTime();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (ageMs < oneHour) return 30_000;      // 30 seconds
    if (ageMs < oneDay) return 300_000;       // 5 minutes
    return null;                               // Don't bother refreshing
}

/**
 * Hook that returns a live-updating relative time string.
 */
function useRelativeTime(date: Date, isValid: boolean): string {
    const compute = useCallback(
        () => (isValid ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'),
        [date.getTime(), isValid]
    );

    const [relativeTime, setRelativeTime] = useState(compute);

    useEffect(() => {
        if (!isValid) return;

        const interval = getRefreshInterval(date);
        if (interval === null) {
            setRelativeTime(compute());
            return;
        }

        setRelativeTime(compute());
        const id = setInterval(() => setRelativeTime(compute()), interval);
        return () => clearInterval(id);
    }, [date.getTime(), isValid, compute]);

    return relativeTime;
}

// Get icon based on notification type or metadata event
function getNotificationIcon(type: string, metadata?: any) {
    const iconMap: Record<string, any> = {
        'APPOINTMENT_SCHEDULED': Calendar,
        'APPOINTMENT_CONFIRMED': CheckCircle,
        'APPOINTMENT_CANCELLED': XCircle,
        'APPOINTMENT_REMINDER': Clock,
        'APPOINTMENT_RESCHEDULED': Calendar,
        'PATIENT_CHECKED_IN': UserCheck,
        'URGENT': AlertCircle,
        'INFO': Bell,
        'PATIENT_ADDED_TO_QUEUE': UserCheck,
        'APPOINTMENT_PENDING_CONFIRMATION': Calendar,
        'PREOP_CHECKLIST_COMPLETED': CheckCircle,
        'THEATER_BOOKED': Calendar,
    };

    const eventType = metadata?.event;
    let iconKey = type;
    if (eventType && iconMap[eventType]) {
        iconKey = eventType;
    }

    const IconComponent = iconMap[iconKey] || Bell;
    return IconComponent;
}

// Get color scheme based on notification type
function getNotificationColor(type: string, metadata?: any) {
    const colorMap: Record<string, string> = {
        'APPOINTMENT_SCHEDULED': 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        'APPOINTMENT_CONFIRMED': 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
        'APPOINTMENT_CANCELLED': 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
        'APPOINTMENT_REMINDER': 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        'APPOINTMENT_RESCHEDULED': 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
        'PATIENT_CHECKED_IN': 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        'URGENT': 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
        'INFO': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        'PATIENT_ADDED_TO_QUEUE': 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        'APPOINTMENT_PENDING_CONFIRMATION': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
        'PREOP_CHECKLIST_COMPLETED': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        'THEATER_BOOKED': 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    };

    const eventType = metadata?.event;
    let colorKey = type;
    if (eventType && colorMap[eventType]) {
        colorKey = eventType;
    }

    return colorMap[colorKey] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isUnread = notification.status !== 'READ';

    // Safely parse the date
    const createdAt = notification.created_at ? new Date(notification.created_at) : new Date();
    const isValidDate = !isNaN(createdAt.getTime());
    const relativeTime = useRelativeTime(createdAt, isValidDate);

    // Parse metadata if string
    let metadata: any = notification.metadata;
    if (typeof metadata === 'string') {
        try {
            metadata = JSON.parse(metadata);
        } catch (e) {
            metadata = {};
        }
    }

    const NotificationIcon = getNotificationIcon(notification.type, metadata);

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
                getNotificationColor(notification.type, metadata)
            )}>
                <NotificationIcon className="h-5 w-5" />
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
                        {relativeTime}
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
