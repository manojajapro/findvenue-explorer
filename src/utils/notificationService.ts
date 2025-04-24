
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
  if (!userId) {
    console.error('Cannot send notification: No target user ID provided');
    return false;
  }

  try {
    console.log(`Sending notification to user ${userId}: ${title}`);
    
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
    
    if (error) {
      console.error('Error from Supabase when sending notification:', error);
      return false;
    }
      
    return true;
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
        
      if (error || !venue) {
        console.error('Error fetching venue data:', error);
        return null;
      }
      
      // Extract owner ID from venue.owner_info
      if (venue.owner_info && typeof venue.owner_info === 'object') {
        const ownerId = (venue.owner_info as any).user_id;
        if (ownerId) {
          console.log(`Found owner ID ${ownerId} for venue ${venueOrId}`);
          return ownerId;
        }
      }
    } else if (venueOrId && venueOrId.ownerInfo) {
      // If venueOrId is a venue object
      return venueOrId.ownerInfo.user_id || null;
    } else if (venueOrId && venueOrId.owner_info) {
      // Alternative property name
      return (venueOrId.owner_info as any).user_id || null;
    }
    
    console.error(`Could not find owner ID for venue:`, venueOrId);
    return null;
  } catch (error) {
    console.error('Error getting venue owner ID:', error);
    return null;
  }
};

/**
 * Formats rules and regulations for display or storage
 * @param rules Raw rules and regulations data
 * @returns Formatted rules and regulations
 */
export const formatRulesAndRegulations = (rules: any): any => {
  if (!rules) return {};
  
  try {
    if (typeof rules === 'string') {
      return JSON.parse(rules);
    }
    return rules;
  } catch (error) {
    console.error('Error formatting rules and regulations:', error);
    return {};
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
  status: 'confirmed' | 'cancelled' | 'pending'
): Promise<boolean> => {
  try {
    // Try both possible owner_id sources
    const ownerId = booking.owner_id || await getVenueOwnerId(booking.venue_id);
    
    if (!ownerId) {
      console.error('Failed to determine venue owner ID for booking status notification:', booking);
      return false;
    }
    
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
    
    // Send notification to owner with appropriate titles and messages based on status
    let ownerTitle, ownerMessage;
    
    switch (status) {
      case 'confirmed':
        ownerTitle = 'Booking Confirmed';
        ownerMessage = `A booking for "${booking.venue_name}" on ${formattedDate} has been confirmed.`;
        break;
      case 'cancelled':
        ownerTitle = 'Booking Cancelled';
        ownerMessage = `A booking for "${booking.venue_name}" on ${formattedDate} has been cancelled.`;
        break;
      case 'pending':
        ownerTitle = 'New Booking Request';
        ownerMessage = `A new booking request for "${booking.venue_name}" on ${formattedDate} requires your attention.`;
        break;
    }
    
    console.log(`Sending ${status} notification to owner ${ownerId}`);
    
    const ownerNotified = await sendNotification(
      ownerId,
      ownerTitle,
      ownerMessage,
      'booking',
      '/customer-bookings',
      notificationData
    );
    
    if (!ownerNotified) {
      console.error(`Failed to notify venue owner about booking ${status} update`);
    }
    
    // Send notification to customer if the user_id is available
    if (booking.user_id) {
      // Customize messages based on status
      let customerTitle, customerMessage;
      
      switch (status) {
        case 'confirmed':
          customerTitle = 'Booking Confirmed';
          customerMessage = `Your booking for ${booking.venue_name} on ${formattedDate} has been confirmed.`;
          break;
        case 'cancelled':
          customerTitle = 'Booking Cancelled';
          customerMessage = `Your booking for ${booking.venue_name} on ${formattedDate} has been cancelled.`;
          break;
        case 'pending':
          customerTitle = 'Booking Submitted';
          customerMessage = `Your booking request for ${booking.venue_name} on ${formattedDate} has been submitted and is awaiting confirmation.`;
          break;
      }
      
      console.log(`Sending ${status} notification to customer ${booking.user_id}`);
      
      const customerNotified = await sendNotification(
        booking.user_id,
        customerTitle,
        customerMessage,
        'booking',
        '/bookings',
        notificationData
      );
      
      if (!customerNotified) {
        console.error(`Failed to notify customer about booking ${status} update`);
      }
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
  if (!booking || !booking.venue_id) {
    console.error('Invalid booking data provided for owner notification');
    return false;
  }

  try {
    // Get the venue owner ID
    let ownerId = null;
    
    // Try to get owner ID from the booking if available
    if (booking.owner_id) {
      ownerId = booking.owner_id;
      console.log('[OWNER_NOTIFY] Using owner ID from booking:', ownerId);
    } else {
      // Otherwise, fetch it from the venue
      ownerId = await getVenueOwnerId(booking.venue_id);
      console.log('[OWNER_NOTIFY] Fetched owner ID for venue:', ownerId);
    }
    
    if (!ownerId) {
      console.error('[OWNER_NOTIFY] Could not find owner ID for venue:', booking.venue_id);
      return false;
    }
    
    const formattedDate = booking.booking_date || 'scheduled date';
    const bookingType = booking.booking_type || 'booking';
    const venueName = booking.venue_name || 'your venue';
    
    const notificationData = {
      booking_id: booking.id,
      venue_id: booking.venue_id,
      status: booking.status || 'pending',
      booking_date: booking.booking_date,
      venue_name: venueName,
      booking_type: bookingType
    };
    
    // Determine the notification message based on whether it's a full-day or hourly booking
    let detailText = '';
    
    if (bookingType === 'full-day' || 
        (booking.start_time === '00:00' && booking.end_time === '23:59')) {
      detailText = `for the entire day`;
    } else {
      detailText = `from ${booking.start_time} to ${booking.end_time}`;
    }
    
    const message = `A new booking request for "${venueName}" on ${formattedDate} ${detailText} has been received.`;
    
    console.log(`[OWNER_NOTIFY] Sending notification to owner ${ownerId}: ${message}`);
    
    const success = await sendNotification(
      ownerId,
      'New Booking Request',
      message,
      'booking',
      '/customer-bookings',
      notificationData
    );
    
    if (!success) {
      console.error('[OWNER_NOTIFY] Failed to send notification to owner');
      return false;
    }
    
    console.log('[OWNER_NOTIFY] Successfully sent notification to venue owner');
    return true;
  } catch (error) {
    console.error('[OWNER_NOTIFY] Error notifying venue owner about booking:', error);
    return false;
  }
};
