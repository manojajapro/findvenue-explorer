
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface BlockedTimeSlot {
  date: string;
  is_full_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

/**
 * Checks if a date is blocked for a venue in the blocked_dates table
 */
export const isDateBlockedForVenue = async (venueId: string, date: Date): Promise<boolean> => {
  if (!venueId || !date) return false;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id, is_full_day')
      .eq('venue_id', venueId)
      .eq('date', dateStr);
      
    if (error) {
      console.error('Error checking if date is blocked:', error);
      return false;
    }
    
    // Check if any of the blocks are full day blocks
    return data && data.some(block => block.is_full_day === true);
  } catch (err) {
    console.error('Exception checking if date is blocked:', err);
    return false;
  }
};

/**
 * Gets all blocked time slots for a venue on a specific date
 */
export const getBlockedTimeSlotsForVenue = async (venueId: string, date: Date): Promise<BlockedTimeSlot[]> => {
  if (!venueId || !date) return [];
  
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('date, is_full_day, start_time, end_time')
      .eq('venue_id', venueId)
      .eq('date', dateStr);
      
    if (error) {
      console.error('Error fetching blocked time slots:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception fetching blocked time slots:', err);
    return [];
  }
};

/**
 * Gets all blocked time slots for a venue
 */
export const getAllBlockedTimeSlotsForVenue = async (venueId: string): Promise<BlockedTimeSlot[]> => {
  if (!venueId) return [];
  
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('date, is_full_day, start_time, end_time')
      .eq('venue_id', venueId);
      
    if (error) {
      console.error('Error fetching all blocked time slots:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception fetching all blocked time slots:', err);
    return [];
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

/**
 * Checks if a specific time slot is available for booking
 */
export const isTimeSlotAvailable = (
  date: Date, 
  startTime: string, 
  endTime: string, 
  blockedSlots: BlockedTimeSlot[]
): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check if there are any full day blocks for this date
  if (blockedSlots.some(slot => slot.date === dateStr && slot.is_full_day)) {
    return false;
  }
  
  // Check if the requested time slot overlaps with any blocked time slots
  for (const block of blockedSlots) {
    if (block.date === dateStr && !block.is_full_day && block.start_time && block.end_time) {
      // Check for overlap: startA < endB && endA > startB
      if (startTime < block.end_time && endTime > block.start_time) {
        return false;
      }
    }
  }
  
  return true;
};
