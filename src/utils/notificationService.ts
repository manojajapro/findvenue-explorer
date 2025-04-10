
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Send a notification to a user
export const sendNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'booking' | 'message' | 'system',
  link?: string,
  data?: any
) => {
  try {
    if (!userId) {
      console.error('Cannot send notification: Missing user ID');
      return null;
    }

    console.log(`Sending ${type} notification to user ${userId}`);
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false,
        link,
        data
      })
      .select();
    
    if (error) {
      console.error('Error sending notification:', error);
      return null;
    }
    
    console.log('Notification sent successfully:', notification);
    return notification;
  } catch (error) {
    console.error('Exception in sendNotification:', error);
    return null;
  }
};

// Notify venue owner about a new booking
export const notifyVenueOwnerAboutBooking = async (booking: any) => {
  if (!booking || !booking.venue_id) return null;
  
  try {
    // Get venue owner ID
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', booking.venue_id)
      .single();
    
    if (venueError || !venueData?.owner_info) {
      console.error('Error fetching venue owner info:', venueError);
      return null;
    }
    
    // Parse owner info
    let ownerId: string | null = null;
    try {
      const ownerInfo = typeof venueData.owner_info === 'string'
        ? JSON.parse(venueData.owner_info)
        : venueData.owner_info;
        
      ownerId = ownerInfo?.user_id || null;
    } catch (e) {
      console.error('Error parsing owner_info:', e);
      return null;
    }
    
    if (!ownerId) {
      console.error('No owner ID found for venue', booking.venue_id);
      return null;
    }
    
    // Format booking date
    const bookingDate = booking.booking_date 
      ? format(new Date(booking.booking_date), 'MMM d, yyyy') 
      : 'scheduled date';
    
    // Send notification
    return await sendNotification(
      ownerId,
      'New Booking Request',
      `A new booking request for "${booking.venue_name}" on ${bookingDate} has been received.`,
      'booking',
      '/customer-bookings',
      {
        booking_id: booking.id,
        venue_id: booking.venue_id
      }
    );
  } catch (error) {
    console.error('Failed to notify venue owner about booking:', error);
    return null;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string) => {
  if (!userId) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    return !error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  if (!notificationId) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    return !error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};
