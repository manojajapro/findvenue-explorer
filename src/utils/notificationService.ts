
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

    console.log(`Sending ${type} notification to user ${userId} with data:`, data);
    
    let attempts = 0;
    let result = null;
    
    while (!result && attempts < maxRetries) {
      try {
        // Ensure data has the correct format
        const formattedData = type === 'booking' ? {
          booking_id: data?.booking_id || data?.id,
          venue_id: data?.venue_id,
          status: data?.status,
          booking_date: data?.booking_date,
          venue_name: data?.venue_name,
          booking_type: data?.booking_type || (data?.start_time === '00:00' && data?.end_time === '23:59' ? 'full-day' : 'hourly')
        } : data;
        
        const { data: notification, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type,
            read: false,
            link,
            data: formattedData
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
    if (!venueId) {
      console.error('Cannot get venue owner: Missing venue ID');
      return null;
    }
    
    console.log('Getting venue owner ID for venue:', venueId);
    
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .maybeSingle();
    
    if (venueError) {
      console.error('Error fetching venue owner info:', venueError);
      return null;
    }
    
    if (!venueData || !venueData.owner_info) {
      console.error('No owner_info found for venue:', venueId, 'Data:', venueData);
      return null;
    }
    
    // Parse owner info
    try {
      console.log('Raw owner_info:', venueData.owner_info);
      
      let ownerInfo: any = venueData.owner_info;
      
      // Parse string if needed
      if (typeof venueData.owner_info === 'string') {
        try {
          ownerInfo = JSON.parse(venueData.owner_info);
        } catch (parseErr) {
          console.error('Failed to parse owner_info JSON:', parseErr);
          
          // Try alternative parsing for malformed JSON
          if (venueData.owner_info.includes('{') && venueData.owner_info.includes('}')) {
            const cleanedStr = venueData.owner_info
              .replace(/'/g, '"')
              .replace(/(\w+):/g, '"$1":');
            try {
              ownerInfo = JSON.parse(cleanedStr);
            } catch (e) {
              console.error('Failed to parse cleaned owner_info:', e);
            }
          }
        }
      }
      
      // Check various possible property names for user ID
      let ownerId = null;
      
      if (typeof ownerInfo === 'object' && ownerInfo !== null) {
        ownerId = ownerInfo.user_id || ownerInfo.userId || ownerInfo.owner_id || ownerInfo.ownerId;
      } else if (typeof ownerInfo === 'string' && ownerInfo.length > 30) {
        // If ownerInfo is a string and looks like a UUID, use it directly
        ownerId = ownerInfo;
      }
      
      console.log('Parsed venue owner ID:', ownerId, 'from owner_info:', ownerInfo);
      
      if (!ownerId) {
        console.error('Failed to extract owner ID from owner_info');
        
        // Try direct raw value as a last resort
        if (typeof venueData.owner_info === 'string' && venueData.owner_info.length > 30) {
          ownerId = venueData.owner_info;
          console.log('Using raw owner_info string as ID:', ownerId);
        }
      }
      
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
    console.log('Attempting to notify venue owner about booking:', booking.id, 'Venue ID:', booking.venue_id);
    
    // Get venue owner ID
    const ownerId = await getVenueOwnerId(booking.venue_id);
    
    if (!ownerId) {
      console.error('No owner ID found for venue', booking.venue_id);
      return null;
    }
    
    console.log('Found venue owner ID to notify:', ownerId);
    
    // Format booking date
    const bookingDate = booking.booking_date 
      ? format(new Date(booking.booking_date), 'yyyy-MM-dd') 
      : 'scheduled date';
      
    // Determine booking type
    const bookingType = booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly';
    
    let title, message;
    
    // Customize message based on auto-confirmation
    if (booking.status === 'confirmed') {
      title = 'New Booking Confirmed';
      message = `A new booking for "${booking.venue_name}" on ${bookingDate} has been automatically confirmed.`;
    } else {
      title = 'New Booking Request';
      message = `A new booking request for "${booking.venue_name}" on ${bookingDate} has been received.`;
    }
    
    // Create the notification data in the consistent requested format
    const notificationData = {
      booking_id: booking.id,
      venue_id: booking.venue_id,
      status: booking.status,
      booking_date: bookingDate,
      venue_name: booking.venue_name,
      booking_type: bookingType
    };
    
    console.log('Sending notification to venue owner with data:', notificationData);
    
    // Send notification with retry attempts
    const notification = await sendNotification(
      ownerId,
      title,
      message,
      'booking',
      '/customer-bookings',
      notificationData,
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
    console.log('Sending booking status notification for booking:', booking.id, 'Status:', status, 'Venue ID:', booking.venue_id);
    
    // Get venue owner ID
    const ownerId = await getVenueOwnerId(booking.venue_id);
    
    if (!ownerId) {
      console.error('No owner ID found for venue', booking.venue_id);
    } else {
      console.log('Found venue owner ID to notify about status update:', ownerId);
    }
    
    const formattedDate = booking.booking_date 
      ? format(new Date(booking.booking_date), 'yyyy-MM-dd') 
      : 'scheduled date';
    
    let notificationsSuccessful = true;
    
    // Determine booking type
    const bookingType = booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly';
    
    // Create consistent notification data format with booking type
    const notificationData = {
      booking_id: booking.id,
      venue_id: booking.venue_id,
      status: status,
      booking_date: formattedDate,
      venue_name: booking.venue_name,
      booking_type: bookingType
    };
    
    console.log('Status notification data:', notificationData);
    
    // Notify owner
    if (ownerId) {
      const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const ownerMessage = status === 'confirmed' 
        ? `A booking for "${booking.venue_name}" on ${formattedDate} has been confirmed${booking.status === 'confirmed' ? ' automatically' : ''}.`
        : `You have cancelled a booking for "${booking.venue_name}" on ${formattedDate}.`;
      
      console.log(`Sending notification to owner ${ownerId} for status ${status}`);
      
      const ownerNotification = await sendNotification(
        ownerId,
        ownerTitle,
        ownerMessage,
        'booking',
        '/customer-bookings',
        notificationData,
        5
      );
      
      if (!ownerNotification) {
        console.error("Failed to send notification to venue owner");
        notificationsSuccessful = false;
      } else {
        console.log("Successfully sent notification to venue owner");
      }
    } else {
      console.error("Unable to notify venue owner - owner ID not found");
      notificationsSuccessful = false;
    }
    
    // Notify customer
    if (booking.user_id) {
      const customerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
      const customerMessage = status === 'confirmed' 
        ? `Your booking for ${booking.venue_name} on ${formattedDate} has been ${booking.status === 'confirmed' ? 'automatically ' : ''}confirmed.`
        : `Your booking for ${booking.venue_name} on ${formattedDate} has been cancelled by the venue owner.`;
      
      console.log(`Sending notification to customer ${booking.user_id} for status ${status}`);
      
      const customerNotification = await sendNotification(
        booking.user_id,
        customerTitle,
        customerMessage,
        'booking',
        '/bookings',
        notificationData,
        5
      );
      
      if (!customerNotification) {
        console.error("Failed to send notification to customer");
        notificationsSuccessful = false;
      } else {
        console.log("Successfully sent notification to customer");
      }
    }
    
    return notificationsSuccessful;
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
  // If the input is null or undefined, return an empty array
  if (!rules) {
    return [];
  }
  
  // If rules is a string, try to parse it
  if (typeof rules === 'string') {
    try {
      return JSON.parse(rules);
    } catch (e) {
      console.error('Error parsing rules_and_regulations string:', e);
      return [];
    }
  }
  
  // If rules is already an array of objects with title, category, description
  if (Array.isArray(rules) && rules.length > 0 && typeof rules[0] === 'object' && rules[0].title) {
    return rules;
  }
  
  // If rules is our previous format (object with general, booking, restrictions)
  if (typeof rules === 'object' && !Array.isArray(rules) && 
      (Array.isArray(rules.general) || Array.isArray(rules.booking) || Array.isArray(rules.restrictions))) {
    
    const formattedRules = [];
    
    // Convert general rules
    if (Array.isArray(rules.general)) {
      rules.general.forEach((rule: string, index: number) => {
        formattedRules.push({
          title: `General Rule ${index + 1}`,
          category: 'General Policies',
          description: rule
        });
      });
    }
    
    // Convert booking rules
    if (Array.isArray(rules.booking)) {
      rules.booking.forEach((rule: string, index: number) => {
        formattedRules.push({
          title: `Booking Rule ${index + 1}`,
          category: 'Reservations and Bookings',
          description: rule
        });
      });
    }
    
    // Convert restriction rules
    if (Array.isArray(rules.restrictions)) {
      rules.restrictions.forEach((rule: string, index: number) => {
        formattedRules.push({
          title: `Restriction ${index + 1}`,
          category: 'Conduct and Behavior',
          description: rule
        });
      });
    }
    
    return formattedRules;
  }
  
  // Default - return an empty array
  return [];
};
