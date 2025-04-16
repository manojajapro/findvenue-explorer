
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
  type?: string;
  categories?: string[];
  pricing?: {
    startingPrice: number;
    pricePerPerson?: number;
    hourlyRate?: number;
    currency: string;
  };
  // Add additional optional fields to make both venue types compatible
  availability?: string[];
  parking?: boolean;
  wifi?: boolean;
  accessibilityFeatures?: string[];
  acceptedPaymentMethods?: string[];
  openingHours?: Record<string, {open: string, close: string}>;
  ownerInfo?: {
    name: string;
    contact: string;
    responseTime: string;
    user_id: string;
  };
  additionalServices?: string[];
  rulesAndRegulations?: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  zipcode?: string;
  categoryNames?: string[];
}

export interface VenueFilter {
  cityId?: string;
  category?: string;
  minCapacity?: number;
  maxPrice?: number;
  search?: string;
  type?: string;
}
