
// If this file already exists, add this type or extend the existing one
export interface Venue {
  id: string;
  name: string;
  description: string;
  city: string;
  cityId: string;
  address: string;
  rating: number;
  reviewsCount: number;
  minPrice: number;
  imageUrl: string;
  capacity: {
    min: number;
    max: number;
  };
  popular?: boolean;
  featured?: boolean;
  isRecentlyAdded?: boolean;
  amenities?: string[];
  images?: string[];
  lat?: number | null;
  lng?: number | null;
  type?: string; // Add this property
  categories?: string[];
}

export interface VenueFilter {
  cityId?: string;
  category?: string;
  minCapacity?: number;
  maxPrice?: number;
  search?: string;
  type?: string; // Add this property to filters
}
