import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Send a notification to a user with retry capability
export const sendNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'booking' | 'message' | 'system',
  link?: string,
  data?: any,
  maxRetries = 3
) => {
  try {
    if (!userId) {
      console.error('Cannot send notification: Missing user ID');
      return null;
    }

    console.log(`Sending ${type} notification to user ${userId}`);
    
    let attempts = 0;
    let result = null;
    
    while (!result && attempts < maxRetries) {
      try {
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
          console.error(`Error sending notification (attempt ${attempts + 1}):`, error);
          attempts++;
          if (attempts < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        } else {
          console.log('Notification sent successfully:', notification);
          result = notification;
          break;
        }
      } catch (e) {
        attempts++;
        console.error(`Exception in sendNotification (attempt ${attempts}):`, e);
        if (attempts < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    return result;
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
      .maybeSingle();
    
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
    
    // Send notification with retry attempts
    const notification = await sendNotification(
      ownerId,
      'New Booking Request',
      `A new booking request for "${booking.venue_name}" on ${bookingDate} has been received.`,
      'booking',
      '/customer-bookings',
      {
        booking_id: booking.id,
        venue_id: booking.venue_id,
        status: booking.status
      },
      5
    );
    
    if (notification) {
      console.log('Notification to venue owner sent successfully');
    } else {
      console.error('Failed to send notification to venue owner after multiple attempts');
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to notify venue owner about booking:', error);
    return null;
  }
};

// Send status update notification to both customer and venue owner
export const sendBookingStatusNotification = async (booking: any, status: string) => {
  if (!booking) return null;
  
  try {
    console.log('Sending booking status notification for booking:', booking.id, 'Status:', status);
    
    // Get venue owner ID
    const ownerId = await getVenueOwnerId(booking.venue_id);
    const formattedDate = booking.booking_date 
      ? format(new Date(booking.booking_date), 'MMM d, yyyy') 
      : 'scheduled date';
    
    // Notify owner
    if (ownerId) {
      const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const ownerMessage = status === 'confirmed' 
        ? `You have confirmed a booking for "${booking.venue_name}" on ${formattedDate}.`
        : `You have cancelled a booking for "${booking.venue_name}" on ${formattedDate}.`;
      
      console.log(`Sending notification to owner ${ownerId} for status ${status}`);
      
      await sendNotification(
        ownerId,
        ownerTitle,
        ownerMessage,
        'booking',
        '/customer-bookings',
        {
          booking_id: booking.id,
          venue_id: booking.venue_id,
          status: status,
          booking_date: booking.booking_date,
          venue_name: booking.venue_name
        },
        5
      );
    }
    
    // Notify customer
    if (booking.user_id) {
      const customerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const customerMessage = status === 'confirmed' 
        ? `Your booking for ${booking.venue_name} on ${formattedDate} has been confirmed.`
        : `Your booking for ${booking.venue_name} on ${formattedDate} has been cancelled by the venue owner.`;
      
      console.log(`Sending notification to customer ${booking.user_id} for status ${status}`);
      
      await sendNotification(
        booking.user_id,
        customerTitle,
        customerMessage,
        'booking',
        '/bookings',
        {
          booking_id: booking.id,
          venue_id: booking.venue_id,
          status: status,
          booking_date: booking.booking_date,
          venue_name: booking.venue_name
        },
        5
      );
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send booking status notifications:', error);
    return false;
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

// Function to ensure rules_and_regulations is properly formatted
export const formatRulesAndRegulations = (rules: any) => {
  // Create a proper object structure with default empty arrays
  let result = {
    general: [],
    booking: [],
    restrictions: []
  };
  
  // If rules is null or undefined, return the default structure
  if (!rules) {
    return result;
  }
  
  // If rules is already an object, extract the arrays safely
  if (typeof rules === 'object' && !Array.isArray(rules)) {
    // Extract arrays safely, ensuring they're arrays
    if (Array.isArray(rules.general)) {
      result.general = rules.general;
    }
    
    if (Array.isArray(rules.booking)) {
      result.booking = rules.booking;
    }
    
    if (Array.isArray(rules.restrictions)) {
      result.restrictions = rules.restrictions;
    }
    
    return result;
  }
  
  // If rules is a string, try to parse it
  if (typeof rules === 'string') {
    try {
      const parsed = JSON.parse(rules);
      return formatRulesAndRegulations(parsed); // Recursively format the parsed object
    } catch (e) {
      console.error('Error parsing rules_and_regulations string:', e);
      return result;
    }
  }
  
  // If rules is an array, add it to general rules
  if (Array.isArray(rules)) {
    result.general = rules;
    return result;
  }
  
  // Default case - return the empty structure
  return result;
};
