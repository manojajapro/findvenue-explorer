
import { supabase } from '@/integrations/supabase/client';

// Enable realtime for a specific table
export const enableRealtimeForTable = async (table: string) => {
  try {
    // Create a channel for the table
    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        console.log(`Realtime change on ${table}:`, payload);
      })
      .subscribe((status) => {
        console.log(`Realtime subscription status for ${table}:`, status);
      });
      
    console.log(`Enabled realtime for table: ${table}`);
    return channel;
  } catch (error) {
    console.error(`Error enabling realtime for ${table}:`, error);
    return null;
  }
};

// Create a function to check if a table is enabled for realtime
export const isTableRealtimeEnabled = async (table: string) => {
  try {
    // Simple check to see if we can subscribe to the table
    const channel = supabase
      .channel(`test-${table}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => {})
      .subscribe();
    
    // Cleanup the test channel
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error(`Error checking realtime for ${table}:`, error);
    return false;
  }
};

// Function to send a notification to a user
export const sendNotification = async (userId: string, title: string, message: string, type: 'booking' | 'message' | 'system', link?: string, data?: any) => {
  try {
    if (!userId) {
      console.error('Cannot send notification: Missing user ID');
      return null;
    }

    // Determine booking type if this is a booking notification
    const bookingType = data?.start_time === '00:00' && data?.end_time === '23:59' ? 'full-day' : 'hourly';
    
    // Ensure data format is consistent
    const notificationData = type === 'booking' ? {
      booking_id: data?.booking_id || data?.id,
      venue_id: data?.venue_id,
      status: data?.status,
      booking_date: data?.booking_date,
      venue_name: data?.venue_name,
      booking_type: bookingType
    } : data;
    
    console.log(`Sending notification to user ${userId} with data:`, notificationData);
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false,
        link,
        data: notificationData
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Error sending notification:', error);
      return null;
    }
    
    console.log('Notification sent successfully:', notification);
    return notification;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return null;
  }
};

// Function to get venue owner ID from venue ID
export const getVenueOwnerId = async (venueId: string): Promise<string | null> => {
  try {
    if (!venueId) {
      console.error('Cannot get venue owner: Missing venue ID');
      return null;
    }
    
    console.log('Getting venue owner ID for venue:', venueId);
    
    const { data, error } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching venue owner info:', error);
      return null;
    }
    
    if (!data || !data.owner_info) {
      console.error('No owner_info found for venue:', venueId);
      return null;
    }
    
    let ownerId: string | null = null;
    
    if (data.owner_info) {
      try {
        const ownerInfo = typeof data.owner_info === 'string' 
          ? JSON.parse(data.owner_info) 
          : data.owner_info;
          
        ownerId = ownerInfo.user_id || null;
        console.log('Found venue owner ID:', ownerId, 'from owner_info:', ownerInfo);
      } catch (e) {
        console.error('Error parsing owner_info:', e, 'Raw data:', data.owner_info);
      }
    }
    
    return ownerId;
  } catch (error) {
    console.error('Error in getVenueOwnerId:', error);
    return null;
  }
};
