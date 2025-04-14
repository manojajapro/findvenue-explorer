
import { supabase } from '@/integrations/supabase/client';

/**
 * Marks a single notification as read
 * @param notificationId ID of the notification to mark as read
 * @returns true if successful, false otherwise
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
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

/**
 * Marks all notifications for a user as read
 * @param userId ID of the user whose notifications to mark as read
 * @returns true if successful, false otherwise
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
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

/**
 * Sends a notification to a specific user
 * @param userId Target user ID
 * @param title Notification title
 * @param message Notification message
 * @param type Notification type ('booking', 'message', 'system')
 * @param link Optional link to navigate to when clicked
 * @param data Optional additional data
 * @returns true if successful, false otherwise
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'booking' | 'message' | 'system',
  link?: string,
  data?: any
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          link,
          data,
          read: false
        }
      ]);
      
    return !error;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

/**
 * Gets the venue owner ID from a venue object or venue ID
 * @param venueOrId Venue object or venue ID
 * @returns Owner ID if found, null otherwise
 */
export const getVenueOwnerId = async (venueOrId: any): Promise<string | null> => {
  try {
    if (typeof venueOrId === 'string') {
      // If venueOrId is a string (venue ID), fetch the venue first
      const { data: venue, error } = await supabase
        .from('venues')
        .select('owner_info')
        .eq('id', venueOrId)
        .single();
        
      if (error || !venue) return null;
      
      // Extract owner ID from venue.owner_info
      if (venue.owner_info && typeof venue.owner_info === 'object') {
        return (venue.owner_info as any).user_id || null;
      }
    } else if (venueOrId && venueOrId.ownerInfo) {
      // If venueOrId is a venue object
      return venueOrId.ownerInfo.user_id || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting venue owner ID:', error);
    return null;
  }
};

/**
 * Sends a booking status notification to both venue owner and customer
 * @param booking Booking object with all required data
 * @param status New booking status
 * @returns true if successful, false otherwise
 */
export const sendBookingStatusNotification = async (
  booking: any,
  status: 'confirmed' | 'cancelled'
): Promise<boolean> => {
  try {
    const ownerId = booking.owner_id || await getVenueOwnerId(booking.venue_id);
    const formattedDate = booking.booking_date || 'scheduled date';
    const bookingType = booking.booking_type || 'booking';
    
    const notificationData = {
      booking_id: booking.id,
      venue_id: booking.venue_id,
      status: status,
      booking_date: booking.booking_date,
      venue_name: booking.venue_name,
      booking_type: bookingType
    };
    
    if (ownerId) {
      // Send notification to owner
      const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const ownerMessage = status === 'confirmed' 
        ? `A booking for "${booking.venue_name}" on ${formattedDate} has been confirmed.`
        : `A booking for "${booking.venue_name}" on ${formattedDate} has been cancelled.`;
      
      await sendNotification(
        ownerId,
        ownerTitle,
        ownerMessage,
        'booking',
        '/customer-bookings',
        notificationData
      );
    }
    
    if (booking.user_id) {
      // Send notification to customer
      const customerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const customerMessage = status === 'confirmed' 
        ? `Your booking for ${booking.venue_name} on ${formattedDate} has been confirmed.`
        : `Your booking for ${booking.venue_name} on ${formattedDate} has been cancelled.`;
      
      await sendNotification(
        booking.user_id,
        customerTitle,
        customerMessage,
        'booking',
        '/bookings',
        notificationData
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error sending booking status notification:', error);
    return false;
  }
};

/**
 * Notifies the venue owner about a new booking
 * @param booking Complete booking object
 * @returns true if successful, false otherwise
 */
export const notifyVenueOwnerAboutBooking = async (booking: any): Promise<boolean> => {
  try {
    const ownerId = booking.owner_id || await getVenueOwnerId(booking.venue_id);
    
    if (!ownerId) {
      console.error('Could not find owner ID for venue:', booking.venue_id);
      return false;
    }
    
    const formattedDate = booking.booking_date || 'scheduled date';
    
    const notificationData = {
      booking_id: booking.id,
      venue_id: booking.venue_id,
      status: booking.status,
      booking_date: booking.booking_date,
      venue_name: booking.venue_name,
      booking_type: booking.booking_type || 'booking'
    };
    
    await sendNotification(
      ownerId,
      'New Booking Request',
      `A new booking request for "${booking.venue_name}" on ${formattedDate} has been received.`,
      'booking',
      '/customer-bookings',
      notificationData
    );
    
    return true;
  } catch (error) {
    console.error('Error notifying venue owner about booking:', error);
    return false;
  }
};
