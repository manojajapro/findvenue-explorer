
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

// Extract venue owner ID from venue data
export const getVenueOwnerId = async (venueId: string): Promise<string | null> => {
  try {
    console.log('Getting venue owner ID for venue:', venueId);
    
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .single();
    
    if (venueError || !venueData?.owner_info) {
      console.error('Error fetching venue owner info:', venueError);
      return null;
    }
    
    // Parse owner info
    try {
      const ownerInfo = typeof venueData.owner_info === 'string'
        ? JSON.parse(venueData.owner_info)
        : venueData.owner_info;
        
      const ownerId = ownerInfo?.user_id || null;
      console.log('Found venue owner ID:', ownerId);
      return ownerId;
      
    } catch (e) {
      console.error('Error parsing owner_info:', e);
      return null;
    }
  } catch (error) {
    console.error('Exception in getVenueOwnerId:', error);
    return null;
  }
};

// Notify venue owner about a new booking
export const notifyVenueOwnerAboutBooking = async (booking: any) => {
  if (!booking || !booking.venue_id) {
    console.error('Cannot send notification: Missing booking or venue ID');
    return null;
  }
  
  try {
    console.log('Attempting to notify venue owner about booking:', booking.id);
    
    // Get venue owner ID
    const ownerId = await getVenueOwnerId(booking.venue_id);
    
    if (!ownerId) {
      console.error('No owner ID found for venue', booking.venue_id);
      return null;
    }
    
    // Format booking date
    const bookingDate = booking.booking_date 
      ? format(new Date(booking.booking_date), 'MMM d, yyyy') 
      : 'scheduled date';
    
    // Send notification
    const notification = await sendNotification(
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
    
    console.log('Notification to venue owner sent:', notification);
    return notification;
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
