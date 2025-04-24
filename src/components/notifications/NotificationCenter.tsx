
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
import { Bell, CheckCircle, Calendar, AlertCircle, X, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/utils/notificationService';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }
        
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      } catch (error) {
        console.error('Exception fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Enable realtime for notifications table
    const enableRealtimeForNotifications = async () => {
      try {
        await supabase.rpc('enable_realtime_for_table', { table_name: 'notifications' });
      } catch (e) {
        console.error('Could not enable realtime for notifications:', e);
      }
    };
    
    enableRealtimeForNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notification_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}` 
        }, 
        (payload) => {
          console.log('Notification change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Show a system notification
            if (Notification.permission === 'granted') {
              const notification = new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico'
              });
              
              notification.onclick = () => {
                window.focus();
                if (newNotification.link) {
                  navigate(newNotification.link);
                }
              };
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update existing notification
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            // Recalculate unread count
            setNotifications(currentNotifications => {
              setUnreadCount(currentNotifications.filter(n => !n.read).length);
              return currentNotifications;
            });
          }
        }
      )
      .subscribe();
      
    // Request notification permission if not already granted
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const handleMarkAsRead = async (id?: string) => {
    try {
      if (!user) return;
      
      if (id) {
        // Mark single notification as read using the utility function
        const success = await markNotificationAsRead(id);
        
        if (success) {
          setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Mark all as read using the utility function
        const success = await markAllNotificationsAsRead(user.id);
        
        if (success) {
          setNotifications(prev => 
            prev.map(n => ({ ...n, read: true }))
          );
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification.id);
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    setOpen(false);
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmed";
      case "cancelled": return "Cancelled";
      case "pending": return "Pending";
      default: return status;
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-blue-500/10 text-blue-500";
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'booking') {
      const status = notification.data?.status;
      switch (status) {
        case 'confirmed':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'cancelled':
          return <X className="h-5 w-5 text-red-500" />;
        case 'pending':
          return <Clock className="h-5 w-5 text-yellow-500" />;
        default:
          return <Calendar className="h-5 w-5 text-amber-500" />;
      }
    } else if (notification.type === 'message') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        </svg>
      );
    } else {
      return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
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
                onClick={() => handleMarkAsRead()}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="p-4 text-center text-findvenue-text-muted">
                <svg className="animate-spin mx-auto h-5 w-5 text-findvenue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-findvenue-text-muted">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-findvenue-surface/20 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-findvenue-text-muted" />
                </div>
                <p>No notifications yet</p>
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
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-findvenue-text'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-findvenue-text-muted line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        {notification.data?.status && (
                          <div className="mt-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getBookingStatusColor(notification.data.status)}`}>
                              {getBookingStatusLabel(notification.data.status)}
                            </span>
                          </div>
                        )}
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

function getNotificationTypeColor(type: string): string {
  switch (type) {
    case 'booking':
      return 'bg-indigo-500/10 text-indigo-500';
    case 'message':
      return 'bg-green-500/10 text-green-500';
    case 'system':
    default:
      return 'bg-blue-500/10 text-blue-500';
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
