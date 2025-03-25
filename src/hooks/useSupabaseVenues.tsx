
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

export const useSupabaseVenues = () => {
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
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
      let query = supabase.from('venues').select('*, categories(*), cities(*)');
      
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
      const { data, error: venuesError, count } = await query.limit(20);
      
      if (venuesError) throw venuesError;
      
      // Transform the data to match the expected format
      const transformedData = data.map(venue => ({
        id: venue.id,
        name: venue.name,
        description: venue.description,
        imageUrl: venue.image_url,
        galleryImages: venue.gallery_images || [],
        address: venue.address,
        city: venue.cities?.name || '',
        cityId: venue.city_id,
        category: venue.categories?.name || '',
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
        availability: venue.availability
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
  
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      
      if (categoriesError) throw categoriesError;
      
      setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  }, []);
  
  // Fetch cities
  const fetchCities = useCallback(async () => {
    try {
      const { data, error: citiesError } = await supabase
        .from('cities')
        .select('*');
      
      if (citiesError) throw citiesError;
      
      setCities(data);
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
