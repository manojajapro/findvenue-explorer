
import { Venue } from '@/hooks/useSupabaseVenues';
import { Json } from '@/integrations/supabase/types';

/**
 * Extract owner user ID from venue owner_info
 * @param venue The venue object
 * @returns The owner user ID or null if not found
 */
export const getVenueOwnerId = (venue: any): string | null => {
  if (!venue || !venue.owner_info) return null;
  
  try {
    if (typeof venue.owner_info === 'string') {
      const parsedOwnerInfo = JSON.parse(venue.owner_info);
      return parsedOwnerInfo.user_id || null;
    } else if (typeof venue.owner_info === 'object') {
      if (Array.isArray(venue.owner_info)) {
        return null; // Handle array case (should not happen in practice)
      }
      // Need to access user_id safely from Json type
      return venue.owner_info.user_id || null;
    }
  } catch (err) {
    console.error("Error parsing owner_info:", err);
  }
  
  return null;
};

/**
 * Check if a user is the owner of a venue
 * @param venue The venue object
 * @param userId The user ID to check
 * @returns True if the user is the owner, false otherwise
 */
export const isVenueOwner = (venue: any, userId: string | undefined): boolean => {
  if (!venue || !userId) return false;
  
  const ownerId = getVenueOwnerId(venue);
  return ownerId === userId;
};

/**
 * Format venue ratings for display
 * @param rating The rating number
 * @returns Formatted rating string
 */
export const formatRating = (rating: number | undefined): string => {
  if (!rating && rating !== 0) return 'No ratings';
  return rating.toFixed(1);
};
