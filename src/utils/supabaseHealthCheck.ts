
import { supabase } from '@/integrations/supabase/client';

// Check if we can connect to Supabase
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Error checking Supabase connection:', error);
    return false;
  }
};

// Update booking status in database
export const updateBookingStatusInDatabase = async (bookingId: string, status: string) => {
  try {
    console.log(`Updating booking ${bookingId} to status ${status} in database`);
    
    // First try the RPC function if available
    try {
      const { data, error } = await supabase.rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_status: status
      });
      
      if (!error) {
        console.log('Updated booking status via RPC function:', data);
        return { data };
      } else {
        console.warn('RPC function failed, falling back to direct update:', error);
      }
    } catch (e) {
      console.warn('Error using RPC function, falling back to direct update:', e);
    }
    
    // Fallback to direct update if RPC function is not available or fails
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', bookingId)
      .select();
      
    if (error) {
      console.error('Error updating booking status:', error);
      throw new Error('Failed to update booking status: ' + error.message);
    }
    
    if (data && data.length > 0) {
      console.log('Successfully updated booking status:', data[0]);
      return { data: data[0] };
    } else {
      console.error('No data returned from booking update');
      return { data: null };
    }
  } catch (error) {
    console.error('Exception in updateBookingStatusInDatabase:', error);
    throw error;
  }
};
