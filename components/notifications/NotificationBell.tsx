'use client';

import { Bell, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
    const { notifications, unreadCount, loading, markAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const handleNotificationClick = (notification: any) => {
        setIsOpen(false);

        if (notification.status !== 'READ') {
            markAsRead(notification.id);
        }

        // Parse metadata if string
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                console.error('Failed to parse notification metadata', e);
                metadata = {};
            }
        }

        // Determine context from current path
        // Default to /doctor if indeterminate, as that's the primary use case for now
        let rolePrefix = '/doctor';
        if (pathname.startsWith('/patient')) rolePrefix = '/patient';
        else if (pathname.startsWith('/admin')) rolePrefix = '/admin';
        else if (pathname.startsWith('/frontdesk')) rolePrefix = '/frontdesk';
        else if (pathname.startsWith('/nurse')) rolePrefix = '/nurse';

        // Navigate based on resource type
        if (metadata?.resourceType === 'appointment' && metadata?.resourceId) {
            router.push(`${rolePrefix}/appointments/${metadata.resourceId}`);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {unreadCount} unread
                        </span>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center p-4 text-center">
                            <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="border-t px-4 py-2 bg-muted/30">
                    <p className="text-[10px] text-center text-muted-foreground">
                        Notifications are saved in your clinical dashboard
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
