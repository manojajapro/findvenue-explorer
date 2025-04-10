
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
      .select('*')
      .single();
      
    if (error) {
      console.error('Error sending notification:', error);
      return null;
    }
    
    console.log('Notification sent:', notification);
    return notification;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return null;
  }
};

// Function to get venue owner ID from venue ID
export const getVenueOwnerId = async (venueId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .single();
      
    if (error || !data) {
      console.error('Error fetching venue owner info:', error);
      return null;
    }
    
    let ownerId: string | null = null;
    
    if (data.owner_info) {
      try {
        const ownerInfo = typeof data.owner_info === 'string' 
          ? JSON.parse(data.owner_info) 
          : data.owner_info;
          
        ownerId = ownerInfo.user_id || null;
      } catch (e) {
        console.error('Error parsing owner_info:', e);
      }
    }
    
    return ownerId;
  } catch (error) {
    console.error('Error in getVenueOwnerId:', error);
    return null;
  }
};
