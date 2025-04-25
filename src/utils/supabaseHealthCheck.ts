
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if we can connect to the Supabase instance
 * @returns true if connection is successful, false otherwise
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // A simple query to check if Supabase connection works
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    return !error;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

/**
 * Updates a booking status in the database
 * @param bookingId ID of the booking to update
 * @param status New status ('confirmed', 'cancelled', or 'pending')
 * @returns The updated booking data if successful
 */
export const updateBookingStatusInDatabase = async (
  bookingId: string, 
  status: 'confirmed' | 'cancelled' | 'pending'
) => {
  try {
    console.log(`[SUPABASE] Updating booking ${bookingId} status to ${status}`);
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
      
    if (error) {
      console.error('[SUPABASE] Update booking status error:', error);
      throw new Error(error.message);
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error('[SUPABASE] Exception updating booking status:', error);
    return { data: null, error };
  }
};
