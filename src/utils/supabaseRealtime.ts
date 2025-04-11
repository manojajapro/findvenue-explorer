
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

// Function to send a notification to a user - enhanced for clarity
export const sendNotification = async (userId: string, title: string, message: string, type: 'booking' | 'message' | 'system', link?: string, data?: any) => {
  try {
    if (!userId) {
      console.error('[SUPABASE_REALTIME] Cannot send notification: Missing user ID');
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
    
    console.log(`[SUPABASE_REALTIME] Sending notification to user ${userId} with data:`, notificationData);
    
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
      console.error('[SUPABASE_REALTIME] Error sending notification:', error);
      return null;
    }
    
    console.log('[SUPABASE_REALTIME] Notification sent successfully:', notification);
    return notification;
  } catch (error) {
    console.error('[SUPABASE_REALTIME] Error in sendNotification:', error);
    return null;
  }
};

// Function to get venue owner ID from venue ID - enhanced for better parsing
export const getVenueOwnerId = async (venueId: string): Promise<string | null> => {
  try {
    if (!venueId) {
      console.error('[SUPABASE_REALTIME] Cannot get venue owner: Missing venue ID');
      return null;
    }
    
    console.log('[SUPABASE_REALTIME] Getting venue owner ID for venue:', venueId);
    
    const { data, error } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .maybeSingle();
      
    if (error) {
      console.error('[SUPABASE_REALTIME] Error fetching venue owner info:', error);
      return null;
    }
    
    if (!data || !data.owner_info) {
      console.error('[SUPABASE_REALTIME] No owner_info found for venue:', venueId);
      return null;
    }
    
    let ownerId: string | null = null;
    
    // Handle string format
    if (typeof data.owner_info === 'string') {
      try {
        const ownerInfo = JSON.parse(data.owner_info);
        ownerId = ownerInfo.user_id || null;
        console.log('[SUPABASE_REALTIME] Parsed owner ID from string:', ownerId);
      } catch (e) {
        console.error('[SUPABASE_REALTIME] Error parsing owner_info string:', e);
        // Try to extract user_id directly if it's a malformed JSON
        if (data.owner_info.includes('user_id')) {
          const match = data.owner_info.match(/"user_id"\s*:\s*"([^"]+)"/);
          if (match && match[1]) ownerId = match[1];
          console.log('[SUPABASE_REALTIME] Extracted owner ID from string using regex:', ownerId);
        }
      }
    } 
    // Handle object format
    else if (typeof data.owner_info === 'object' && data.owner_info !== null) {
      try {
        ownerId = (data.owner_info as any).user_id || null;
        console.log('[SUPABASE_REALTIME] Found owner ID directly from object:', ownerId);
      } catch (e) {
        console.error('[SUPABASE_REALTIME] Error accessing owner_info object:', e);
      }
    }
    
    if (!ownerId) {
      console.error('[SUPABASE_REALTIME] Could not extract owner ID from:', data.owner_info);
    }
    
    return ownerId;
  } catch (error) {
    console.error('[SUPABASE_REALTIME] Error in getVenueOwnerId:', error);
    return null;
  }
};
