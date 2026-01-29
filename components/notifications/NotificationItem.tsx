'use client';

import { NotificationResponseDto } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Bell, Mail, MessageSquare } from 'lucide-react';

interface NotificationItemProps {
    notification: NotificationResponseDto;
    onClick: (id: number) => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isRead = notification.status === 'READ';

    const getIcon = () => {
        switch (notification.type) {
            case 'EMAIL':
                return <Mail className="h-4 w-4" />;
            case 'SMS':
                return <MessageSquare className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    return (
        <div
            onClick={() => !isRead && onClick(notification.id)}
            className={cn(
                "flex gap-3 p-4 cursor-pointer transition-colors border-b last:border-0",
                isRead ? "bg-background opacity-60" : "bg-primary/5 hover:bg-primary/10"
            )}
        >
            <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                        "text-sm truncate",
                        !isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                    )}>
                        {notification.subject || 'New Notification'}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>
            </div>
            {!isRead && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
        </div>
    );
}
