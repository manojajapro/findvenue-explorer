
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if a date is blocked for a venue in the blocked_dates table
 */
export const isDateBlockedForVenue = async (venueId: string, date: Date): Promise<boolean> => {
  if (!venueId || !date) return false;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('venue_id', venueId)
      .eq('date', dateStr);
      
    if (error) {
      console.error('Error checking if date is blocked:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error('Exception checking if date is blocked:', err);
    return false;
  }
};

/**
 * Checks if a booking exists on a specific date for a venue
 */
export const hasBookingsOnDate = async (venueId: string, date: Date): Promise<boolean> => {
  if (!venueId || !date) return false;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('venue_id', venueId)
      .eq('booking_date', dateStr)
      .in('status', ['pending', 'confirmed']);
      
    if (error) {
      console.error('Error checking bookings on date:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error('Exception checking bookings on date:', err);
    return false;
  }
};
