
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'system';
  read: boolean;
  created_at: string;
  link?: string;
  data?: any;
};

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        setNotifications(data as unknown as Notification[]);
        setUnreadCount(data.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notification_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}` 
        }, 
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id?: string) => {
    if (!user) return;

    try {
      if (id) {
        // Mark single notification as read
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
          
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      } else {
        // Mark all as read
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
          
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] text-xs bg-findvenue border-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-none shadow-none">
          <div className="px-4 py-2 border-b border-findvenue-surface flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-8" 
                onClick={() => markAsRead()}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[350px]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-findvenue-text-muted">
                No notifications
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <CardContent 
                    key={notification.id}
                    className={`p-3 border-b border-findvenue-surface/50 cursor-pointer hover:bg-findvenue-surface/20 transition-colors ${
                      !notification.read ? 'bg-findvenue/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${getNotificationTypeColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-findvenue-text'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-findvenue-text-muted line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-findvenue-text-muted mt-1">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-findvenue shrink-0 mt-1"></div>
                      )}
                    </div>
                  </CardContent>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

// Helper functions
function getNotificationTypeColor(type: string): string {
  switch (type) {
    case 'booking':
      return 'bg-indigo-500/10 text-indigo-500';
    case 'message':
      return 'bg-green-500/10 text-green-500';
    case 'system':
    default:
      return 'bg-yellow-500/10 text-yellow-500';
  }
}

function getNotificationIcon(type: string): JSX.Element {
  switch (type) {
    case 'booking':
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>;
    case 'message':
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>;
    case 'system':
    default:
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
  }
}

function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default NotificationCenter;
