
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface VenueFilter {
  cityId?: string;
  categoryId?: string;
  guests?: number;
  priceRange?: string;
  amenities?: string[];
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  galleryImages: string[];
  address: string;
  city: string;
  cityId: string;
  category: string;
  categoryId: string;
  capacity: {
    min: number;
    max: number;
  };
  pricing: {
    currency: string;
    startingPrice: number;
    pricePerPerson: number;
  };
  amenities: string[];
  rating: number;
  reviews: number;
  featured: boolean;
  popular: boolean;
  availability: string[];
  // New fields
  latitude?: number;
  longitude?: number;
  parking?: boolean;
  wifi?: boolean;
  accessibilityFeatures?: string[];
  acceptedPaymentMethods?: string[];
  openingHours?: Record<string, {open: string, close: string}>;
  ownerInfo?: {
    name: string;
    contact: string;
    responseTime: string;
  };
  additionalServices?: string[];
}

export const useSupabaseVenues = () => {
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Extract filters from URL parameters
  const extractFilters = useCallback(() => {
    const filters: VenueFilter = {};
    
    if (searchParams.has('cityId')) {
      filters.cityId = searchParams.get('cityId') || undefined;
    }
    
    if (searchParams.has('categoryId')) {
      filters.categoryId = searchParams.get('categoryId') || undefined;
    }
    
    if (searchParams.has('guests')) {
      const guestsParam = searchParams.get('guests');
      filters.guests = guestsParam ? parseInt(guestsParam) : undefined;
    }
    
    if (searchParams.has('priceRange')) {
      filters.priceRange = searchParams.get('priceRange') || undefined;
    }
    
    if (searchParams.has('amenities')) {
      const amenitiesParam = searchParams.get('amenities');
      filters.amenities = amenitiesParam ? amenitiesParam.split(',') : undefined;
    }
    
    return filters;
  }, [searchParams]);
  
  // Fetch all venues with filters
  const fetchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = extractFilters();
      
      // Start building the query
      let query = supabase.from('venues').select('*', { count: 'exact' });
      
      // Apply filters
      if (filters.cityId) {
        query = query.eq('city_id', filters.cityId);
      }
      
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      
      if (filters.guests) {
        query = query.lte('min_capacity', filters.guests).gte('max_capacity', filters.guests);
      }
      
      if (filters.priceRange) {
        switch (filters.priceRange) {
          case 'budget':
            query = query.lt('starting_price', 15000);
            break;
          case 'mid':
            query = query.gte('starting_price', 15000).lt('starting_price', 30000);
            break;
          case 'luxury':
            query = query.gte('starting_price', 30000);
            break;
        }
      }
      
      if (filters.amenities && filters.amenities.length > 0) {
        // For each amenity, check if it's in the amenities array
        filters.amenities.forEach(amenity => {
          query = query.contains('amenities', [amenity]);
        });
      }
      
      // Execute the query
      const { data, error: venuesError, count } = await query.limit(100);
      
      if (venuesError) throw venuesError;
      
      // Transform the data to match the expected format
      const transformedData = data.map(venue => ({
        id: venue.id,
        name: venue.name,
        description: venue.description,
        imageUrl: venue.image_url,
        galleryImages: venue.gallery_images || [],
        address: venue.address,
        city: venue.city_name || '',
        cityId: venue.city_id,
        category: venue.category_name || '',
        categoryId: venue.category_id,
        capacity: {
          min: venue.min_capacity,
          max: venue.max_capacity
        },
        pricing: {
          currency: venue.currency,
          startingPrice: venue.starting_price,
          pricePerPerson: venue.price_per_person
        },
        amenities: venue.amenities || [],
        rating: venue.rating,
        reviews: venue.reviews_count,
        featured: venue.featured,
        popular: venue.popular,
        availability: venue.availability || [],
        // New fields
        latitude: venue.latitude,
        longitude: venue.longitude,
        parking: venue.parking,
        wifi: venue.wifi,
        accessibilityFeatures: venue.accessibility_features || [],
        acceptedPaymentMethods: venue.accepted_payment_methods || [],
        openingHours: venue.opening_hours,
        ownerInfo: venue.owner_info ? {
          name: venue.owner_info.name,
          contact: venue.owner_info.contact,
          responseTime: venue.owner_info.response_time
        } : undefined,
        additionalServices: venue.additional_services || []
      }));
      
      setVenues(transformedData);
      setTotalCount(count || 0);
      
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [extractFilters]);
  
  // Fetch categories from our view
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: categoriesError } = await supabase
        .from('category_groups')
        .select('*');
      
      if (categoriesError) throw categoriesError;
      
      setCategories(data.map(cat => ({
        id: cat.category_id,
        name: cat.category_name,
        venue_count: cat.venue_count,
        image_url: cat.image_url
      })));
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  }, []);
  
  // Fetch cities from our view
  const fetchCities = useCallback(async () => {
    try {
      const { data, error: citiesError } = await supabase
        .from('city_groups')
        .select('*');
      
      if (citiesError) throw citiesError;
      
      setCities(data.map(city => ({
        id: city.city_id,
        name: city.city_name,
        venue_count: city.venue_count,
        image_url: city.image_url
      })));
    } catch (error: any) {
      console.error('Error fetching cities:', error);
    }
  }, []);
  
  // Fetch all data when filters change
  useEffect(() => {
    fetchVenues();
    fetchCategories();
    fetchCities();
  }, [fetchVenues, fetchCategories, fetchCities]);
  
  return {
    venues,
    categories,
    cities,
    isLoading,
    error,
    totalCount,
    fetchVenues,
    fetchCategories,
    fetchCities
  };
};
