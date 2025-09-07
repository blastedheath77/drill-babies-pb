'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  BellRing,
  Check,
  CheckCheck, 
  Trash2, 
  Settings,
  Circle,
  Users,
  Trophy,
  BarChart,
  Megaphone,
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@/lib/notifications';
import { subscribeToUserNotifications } from '@/lib/notifications-client';
import type { UserNotification, NotificationType } from '@/lib/types';

interface NotificationCenterProps {
  className?: string;
  showBadge?: boolean;
  variant?: 'dropdown' | 'panel' | 'button';
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'circle_invite':
    case 'circle_invite_accepted':
    case 'circle_invite_declined':
      return Circle;
    case 'game_result':
      return Trophy;
    case 'rating_change':
      return BarChart;
    case 'system_announcement':
      return Megaphone;
    case 'profile_update':
      return User;
    default:
      return Bell;
  }
}

// Get color scheme for notification type
function getNotificationColors(type: NotificationType, read: boolean) {
  const baseClasses = {
    background: read ? 'bg-background hover:bg-accent/50' : 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary',
    icon: read ? 'text-muted-foreground' : 'text-primary',
    title: read ? 'text-foreground' : 'text-foreground font-medium',
    message: 'text-muted-foreground text-sm'
  };

  return baseClasses;
}

// Individual notification item component
function NotificationItem({ 
  notification, 
  onRead, 
  onDelete,
  compact = false 
}: { 
  notification: UserNotification; 
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const Icon = getNotificationIcon(notification.type);
  const colors = getNotificationColors(notification.type, notification.read);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const createdAt = new Date(notification.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <div className={cn('p-3 rounded-lg transition-colors cursor-pointer group', colors.background)}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={cn('truncate', colors.title)}>
                {notification.title}
              </h4>
              {!compact && (
                <p className={cn('mt-1 line-clamp-2', colors.message)}>
                  {notification.message}
                </p>
              )}
            </div>
            
            {/* Unread indicator */}
            {!notification.read && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            )}
          </div>

          {/* Timestamp and actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleMarkAsRead}
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Action buttons if present */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {notification.actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.type === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter({ 
  className,
  showBadge = true,
  variant = 'dropdown'
}: NotificationCenterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const [notificationsResult, count] = await Promise.all([
          getUserNotifications(user.id, { limitCount: 10 }),
          getUnreadNotificationCount(user.id)
        ]);

        setNotifications(notificationsResult.notifications);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Set up real-time subscription
    const unsubscribe = subscribeToUserNotifications(
      user.id,
      (updatedNotifications) => {
        setNotifications(updatedNotifications.slice(0, 10));
        const unreadCountFromNotifications = updatedNotifications.filter(n => !n.read).length;
        setUnreadCount(unreadCountFromNotifications);
      },
      { limitCount: 10 }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed'
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({
        title: 'All notifications marked as read',
        description: 'Your notifications have been cleared'
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      });
    }
  };

  if (!user) return null;

  const NotificationButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={() => setIsOpen(!isOpen)}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
      {showBadge && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  if (variant === 'button') {
    return NotificationButton;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {NotificationButton}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  compact={true}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <DropdownMenuItem className="justify-center text-primary font-medium cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;