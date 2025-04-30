
import { Venue } from '@/hooks/useSupabaseVenues';
import { Json } from '@/integrations/supabase/types';

/**
 * Extract owner user ID from venue owner_info
 * @param venue The venue object
 * @returns The owner user ID or null if not found
 */
export const getVenueOwnerId = (venue: any): string | null => {
  if (!venue) return null;
  
  try {
    // Handle the case when venue.ownerInfo already exists as a parsed object
    if (venue.ownerInfo && typeof venue.ownerInfo === 'object') {
      return venue.ownerInfo.user_id || null;
    }
    
    // Handle the case when owner_info exists in the raw venue data
    if (venue.owner_info) {
      if (typeof venue.owner_info === 'string') {
        try {
          const parsedOwnerInfo = JSON.parse(venue.owner_info);
          return parsedOwnerInfo.user_id || null;
        } catch (e) {
          console.error("Failed to parse owner_info string:", e);
          return null;
        }
      } else if (typeof venue.owner_info === 'object') {
        if (Array.isArray(venue.owner_info)) {
          return null; // Handle array case (should not happen in practice)
        }
        return (venue.owner_info as any).user_id || null;
      }
    }
  } catch (err) {
    console.error("Error extracting owner ID:", err);
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

/**
 * Process category names from various formats to a clean array
 * @param categories The categories in any format
 * @returns Array of category names
 */
export const processCategoryNames = (categories: any): string[] => {
  if (!categories) return [];
  
  // Handle array directly
  if (Array.isArray(categories)) {
    return categories.map(cat => {
      if (typeof cat === 'string') {
        return cat.replace(/[[\]']/g, '').trim();
      }
      return String(cat).trim();
    });
  }
  
  // Handle string formats
  if (typeof categories === 'string') {
    // Check if the string looks like an array representation
    if (categories.startsWith('[') && categories.endsWith(']')) {
      try {
        // Try to parse as JSON - normalize both single and double quotes
        let normalizedJson = categories;
        if (categories.includes("'") && !categories.includes('"')) {
          normalizedJson = categories.replace(/'/g, '"');
        }
        
        const parsed = JSON.parse(normalizedJson);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim());
        }
      } catch (e) {
        console.error("Error parsing category JSON:", e);
      }
    }
    
    // Check if comma-separated list
    if (categories.includes(',')) {
      return categories.split(',').map(cat => cat.trim());
    }
    
    // Handle concatenated categories with CamelCase or specific words as boundaries
    const knownCategories = [
      'Exhibitions and Conferences',
      'Graduation party',
      'Training Course',
      'Birthday',
      'Auctions',
      'Business Meeting',
      'Workshops',
      'Family Meeting',
      'Engagement party'
    ];
    
    // Try to match known categories in the string
    let remainingString = categories;
    const foundCategories: string[] = [];
    
    knownCategories.forEach(category => {
      if (remainingString.includes(category)) {
        foundCategories.push(category);
        remainingString = remainingString.replace(category, '');
      }
    });
    
    if (foundCategories.length > 0) {
      return foundCategories;
    }
    
    // If no known categories found, try splitting by CamelCase
    return categories
      .replace(/([a-z])([A-Z])/g, '$1,$2')
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
  }
  
  return [];
};

// Parse numeric values safely from various formats (string or number)
export const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Extract digits if the string contains text
    const matches = value.match(/\d+/);
    if (matches && matches.length > 0) {
      return parseInt(matches[0], 10);
    }
    
    // Try direct parsing
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  
  return defaultValue;
};
