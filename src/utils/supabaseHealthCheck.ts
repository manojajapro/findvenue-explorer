
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the Supabase connection is working properly
 * @returns true if connected, false otherwise
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('bookings').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};

/**
 * Updates a booking's status in the database
 * @param bookingId ID of the booking to update
 * @param status New status ('confirmed' or 'cancelled')
 * @returns The response from the database
 */
export const updateBookingStatusInDatabase = async (
  bookingId: string, 
  status: 'confirmed' | 'cancelled'
) => {
  return await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select();
};
