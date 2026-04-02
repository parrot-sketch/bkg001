'use client';

/**
 * Enhanced NotificationBell Component
 * 
 * Features:
 * - Modern, polished UI with gradients and shadows
 * - Grouped notifications (Today/Earlier)
 * - Type-based icons and colors
 * - Quick actions (Mark all read, View all)
 * - Smooth animations
 */

import { Bell, Loader2, CheckCheck, ChevronRight, Calendar, UserCheck, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function NotificationBell() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [showStaleRead, setShowStaleRead] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Group notifications by date, separating active from stale read notifications
    const groupedNotifications = useMemo(() => {
        const today: any[] = [];
        const yesterday: any[] = [];
        const earlier: any[] = [];
        const staleRead: any[] = [];

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        notifications.forEach((notification) => {
            const createdAt = notification.created_at ? new Date(notification.created_at) : new Date();

            // Skip if invalid date
            if (isNaN(createdAt.getTime())) {
                today.push(notification); // Default to today for invalid dates
                return;
            }

            // Separate stale read notifications (>24h old and already read)
            const isStaleRead = notification.status === 'READ' && createdAt.getTime() < twentyFourHoursAgo;
            if (isStaleRead) {
                staleRead.push(notification);
                return;
            }

            if (isToday(createdAt)) {
                today.push(notification);
            } else if (isYesterday(createdAt)) {
                yesterday.push(notification);
            } else {
                earlier.push(notification);
            }
        });

        return { today, yesterday, earlier, staleRead };
    }, [notifications]);

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
        let rolePrefix = '/doctor';
        if (pathname.startsWith('/patient')) rolePrefix = '/patient';
        else if (pathname.startsWith('/admin')) rolePrefix = '/admin';
        else if (pathname.startsWith('/frontdesk')) rolePrefix = '/frontdesk';
        else if (pathname.startsWith('/nurse')) rolePrefix = '/nurse';

        // Check for specific event types in metadata
        const eventType = metadata?.event;

        // Navigate based on event type
        if (eventType === 'PATIENT_ADDED_TO_QUEUE') {
            // Navigate to doctor dashboard with queue section
            router.push('/doctor/dashboard#queue');
        } else if (eventType === 'APPOINTMENT_PENDING_CONFIRMATION') {
            // Navigate to appointments page for pending confirmations
            router.push('/doctor/appointments');
        } else if (eventType === 'PREOP_CHECKLIST_COMPLETED' && metadata?.surgicalCaseId) {
            // Navigate to surgical case
            router.push(`/doctor/surgical-cases/${metadata.surgicalCaseId}`);
        } else if (eventType === 'THEATER_BOOKED' && metadata?.surgicalCaseId) {
            // Navigate to surgical cases with scheduled tab
            router.push('/doctor/surgical-cases?status=SCHEDULED');
        } else if (metadata?.navigateTo) {
            // Custom navigation path
            router.push(metadata.navigateTo);
        } else if (metadata?.resourceType === 'appointment' && metadata?.resourceId) {
            router.push(`${rolePrefix}/appointments/${metadata.resourceId}`);
        }
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
        toast.success('All notifications marked as read');
    };

    const handleViewAll = () => {
        setIsOpen(false);
        let rolePrefix = '/doctor';
        if (pathname.startsWith('/patient')) rolePrefix = '/patient';
        else if (pathname.startsWith('/admin')) rolePrefix = '/admin';
        else if (pathname.startsWith('/frontdesk')) rolePrefix = '/frontdesk';
        router.push(`${rolePrefix}/notifications`);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted/50 transition-colors">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg animate-in zoom-in-50">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 overflow-hidden shadow-xl border-muted" align="end">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Notifications</h3>
                    </div>
                    {unreadCount > 0 && (
                        <Badge variant="default" className="bg-primary shadow-sm">
                            {unreadCount} new
                        </Badge>
                    )}
                </div>

                {/* Content */}
                <ScrollArea className="h-[28rem]">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <div className="text-center space-y-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                <p className="text-xs text-muted-foreground">Loading notifications...</p>
                            </div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center p-6 text-center">
                            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                                <Bell className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                We'll notify you when something important happens
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Today */}
                            {groupedNotifications.today.length > 0 && (
                                <div>
                                    <div className="sticky top-0 px-4 py-2 bg-muted/40 backdrop-blur-sm border-b z-10">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Today
                                        </p>
                                    </div>
                                    {groupedNotifications.today.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Yesterday */}
                            {groupedNotifications.yesterday.length > 0 && (
                                <div>
                                    <div className="sticky top-0 px-4 py-2 bg-muted/40 backdrop-blur-sm border-b z-10">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Yesterday
                                        </p>
                                    </div>
                                    {groupedNotifications.yesterday.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Earlier */}
                            {groupedNotifications.earlier.length > 0 && (
                                <div>
                                    <div className="sticky top-0 px-4 py-2 bg-muted/40 backdrop-blur-sm border-b z-10">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Earlier
                                        </p>
                                    </div>
                                    {groupedNotifications.earlier.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Collapsed older read notifications */}
                            {groupedNotifications.staleRead.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowStaleRead(!showStaleRead)}
                                        className="sticky top-0 w-full px-4 py-2 bg-muted/30 backdrop-blur-sm border-b z-10 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                    >
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {groupedNotifications.staleRead.length} older read notification{groupedNotifications.staleRead.length !== 1 ? 's' : ''}
                                        </p>
                                        {showStaleRead ? (
                                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </button>
                                    {showStaleRead && groupedNotifications.staleRead.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t px-3 py-2 bg-muted/20 flex items-center justify-between gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="text-xs h-8"
                            >
                                <CheckCheck className="h-3 w-3 mr-1.5" />
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewAll}
                            className="text-xs h-8 ml-auto"
                        >
                            View all
                            <ChevronRight className="h-3 w-3 ml-1.5" />
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
