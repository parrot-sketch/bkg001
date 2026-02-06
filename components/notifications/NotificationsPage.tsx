'use client';

/**
 * Notifications Page Component
 * 
 * Full page view for all notifications with filtering and bulk actions.
 * Shared across all user roles.
 */

import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Filter, 
  Search,
  Calendar,
  UserCheck,
  XCircle,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationsPageProps {
  rolePrefix: string;
}

export function NotificationsPage({ rolePrefix }: NotificationsPageProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllAsRead 
  } = useNotifications();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      // Status filter
      if (filterStatus === 'unread' && notification.status === 'READ') return false;
      if (filterStatus === 'read' && notification.status !== 'READ') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = notification.subject?.toLowerCase().includes(query);
        const matchesMessage = notification.message.toLowerCase().includes(query);
        if (!matchesSubject && !matchesMessage) return false;
      }

      return true;
    });
  }, [notifications, filterStatus, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; notifications: typeof notifications }[] = [];
    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const thisWeek: typeof notifications = [];
    const older: typeof notifications = [];

    filteredNotifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (isThisWeek(date)) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });

    if (today.length > 0) groups.push({ label: 'Today', notifications: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
    if (thisWeek.length > 0) groups.push({ label: 'This Week', notifications: thisWeek });
    if (older.length > 0) groups.push({ label: 'Older', notifications: older });

    return groups;
  }, [filteredNotifications]);

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const getNotificationIcon = (notification: typeof notifications[0]) => {
    // Parse metadata if it's a string
    let metadata = notification.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = null;
      }
    }

    const type = (metadata as any)?.type as NotificationType | undefined;
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (notification: typeof notifications[0]) => {
    if (notification.status === 'READ') {
      return 'bg-white';
    }
    return 'bg-blue-50/50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'You\'re all caught up!'}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            className="gap-2"
          >
            {isMarkingAllAsRead ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || filterStatus !== 'all'
                ? 'No notifications match your current filters.'
                : 'You don\'t have any notifications yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.label}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {group.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-4 p-4 transition-colors hover:bg-slate-50/50',
                        getNotificationBg(notification)
                      )}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {notification.subject && (
                              <h4 className={cn(
                                'text-sm',
                                notification.status !== 'READ' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                              )}>
                                {notification.subject}
                              </h4>
                            )}
                            <p className={cn(
                              'text-sm',
                              notification.status !== 'READ' ? 'text-slate-700' : 'text-muted-foreground'
                            )}>
                              {notification.message}
                            </p>
                          </div>
                          {notification.status !== 'READ' && (
                            <Badge variant="secondary" className="flex-shrink-0 bg-blue-100 text-blue-700">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                          </span>
                          {notification.status !== 'READ' && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-primary hover:underline"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700">{notifications.length - unreadCount}</p>
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">
                {groupedNotifications.find(g => g.label === 'Today')?.notifications.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
