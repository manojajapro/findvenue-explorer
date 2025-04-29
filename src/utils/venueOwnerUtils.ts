
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if the current user is the owner of a specific venue
 * 
 * @param venueId ID of the venue to check
 * @param userId Current user's ID
 * @returns Promise<boolean> True if user is the venue owner, false otherwise
 */
export const isUserVenueOwner = async (venueId: string, userId: string): Promise<boolean> => {
  try {
    if (!venueId || !userId) return false;
    
    console.log(`Checking if user ${userId} owns venue ${venueId}`);
    
    const { data, error } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .single();
      
    if (error) {
      console.error('Error checking venue ownership:', error);
      return false;
    }
    
    if (!data?.owner_info) return false;
    
    const ownerInfo = typeof data.owner_info === 'string' 
      ? JSON.parse(data.owner_info) 
      : data.owner_info;
    
    const ownerId = ownerInfo.user_id;
    
    return ownerId === userId;
  } catch (err) {
    console.error('Error checking venue ownership:', err);
    return false;
  }
};

/**
 * Get the owner ID of a specific venue
 * 
 * @param venueId ID of the venue
 * @returns Promise<string|null> Venue owner's user ID or null if not found
 */
export const getVenueOwnerId = async (venueId: string): Promise<string | null> => {
  try {
    if (!venueId) return null;
    
    const { data, error } = await supabase
      .from('venues')
      .select('owner_info')
      .eq('id', venueId)
      .single();
      
    if (error) {
      console.error('Error getting venue owner:', error);
      return null;
    }
    
    if (!data?.owner_info) return null;
    
    const ownerInfo = typeof data.owner_info === 'string' 
      ? JSON.parse(data.owner_info) 
      : data.owner_info;
    
    return ownerInfo.user_id || null;
  } catch (err) {
    console.error('Error getting venue owner:', err);
    return null;
  }
};

/**
 * Check if a date is already blocked for a venue
 * 
 * @param venueId ID of the venue
 * @param date Date to check in 'YYYY-MM-DD' format
 * @returns Promise<boolean> True if the date is blocked, false otherwise
 */
export const isDateBlockedForVenue = async (venueId: string, date: string): Promise<boolean> => {
  try {
    if (!venueId || !date) return false;
    
    console.log("Checking if date is blocked:", date, "for venue:", venueId);
    
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('venue_id', venueId)
      .eq('date', date)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking blocked date:', error);
      return false;
    }
    
    const isBlocked = !!data;
    console.log("Blocked date check result:", isBlocked ? "Blocked" : "Not blocked");
    
    return isBlocked;
  } catch (err) {
    console.error('Error checking blocked date:', err);
    return false;
  }
};

/**
 * Check if a date has existing bookings for a venue
 * 
 * @param venueId ID of the venue
 * @param date Date to check in 'YYYY-MM-DD' format
 * @returns Promise<boolean> True if the date has bookings, false otherwise
 */
export const isDateBookedForVenue = async (venueId: string, date: string): Promise<boolean> => {
  try {
    if (!venueId || !date) return false;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('venue_id', venueId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending'])
      .maybeSingle();
      
    if (error) {
      console.error('Error checking booked date:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Error checking booked date:', err);
    return false;
  }
};
