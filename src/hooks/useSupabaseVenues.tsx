import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface VenueFilter {
  cityId?: string;
  categoryId?: string;
  guests?: number;
  priceRange?: string;
  amenities?: string[];
  type?: string;
}

export interface VenueRule {
  category: string;
  title: string;
  description: string;
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
    pricePerPerson?: number;
    hourlyRate?: number;
  };
  amenities: string[];
  rating: number;
  reviews: number;
  featured?: boolean;
  popular?: boolean;
  availability?: string[];
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
    user_id: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    }
  };
  additionalServices?: string[];
  status?: string;
  rulesAndRegulations?: VenueRule[];
  type?: string;       
  zipcode?: string;    
}

export const useSupabaseVenues = () => {
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
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
    
    if (searchParams.has('type')) {
      filters.type = searchParams.get('type') || undefined;
    }
    
    return filters;
  }, [searchParams]);
  
  const fetchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = extractFilters();
      
      let query = supabase.from('venues').select('*', { count: 'exact' });
      
      if (filters.cityId) {
        query = query.eq('city_id', filters.cityId);
      }
      
      if (filters.categoryId) {
        query = query.contains('category_id', [filters.categoryId]);
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
        filters.amenities.forEach(amenity => {
          query = query.contains('amenities', [amenity]);
        });
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      const { data, error: venuesError, count } = await query;
      
      if (venuesError) throw venuesError;
      
      if (data) {
        console.log("Raw venues data:", data);
        
        const transformedData = data.map(venue => {
          let ownerInfoData = undefined;
          try {
            if (venue.owner_info) {
              const ownerInfo = typeof venue.owner_info === 'string'
                ? JSON.parse(venue.owner_info)
                : (venue.owner_info as Record<string, any>);
                
              ownerInfoData = {
                name: ownerInfo.name || '',
                contact: ownerInfo.contact || '',
                responseTime: ownerInfo.response_time || '',
                user_id: ownerInfo.user_id || '',
                socialLinks: ownerInfo.social_links || {}
              };
            }
          } catch (e) {
            console.error("Error parsing owner_info for venue", venue.id, e);
          }
          
          let openingHoursData = undefined;
          try {
            if (venue.opening_hours) {
              openingHoursData = typeof venue.opening_hours === 'string'
                ? JSON.parse(venue.opening_hours)
                : (venue.opening_hours as Record<string, {open: string, close: string}>);
            }
          } catch (e) {
            console.error("Error parsing opening_hours for venue", venue.id, e);
          }
          
          let rulesAndRegulationsData = undefined;
          try {
            if (venue.rules_and_regulations) {
              rulesAndRegulationsData = typeof venue.rules_and_regulations === 'string'
                ? JSON.parse(venue.rules_and_regulations)
                : (venue.rules_and_regulations as Array<{
                    category: string;
                    title: string;
                    description: string;
                  }>);
            }
          } catch (e) {
            console.error("Error parsing rules_and_regulations for venue", venue.id, e);
          }

          const defaultImage = venue.gallery_images && venue.gallery_images.length > 0 
            ? venue.gallery_images[0] 
            : '';
          
          return {
            id: venue.id,
            name: venue.name,
            description: venue.description || '',
            imageUrl: defaultImage,
            galleryImages: venue.gallery_images || [],
            address: venue.address || '',
            city: venue.city_name || '',
            cityId: venue.city_id || '',
            category: venue.category_name || '',
            categoryId: venue.category_id || '',
            capacity: {
              min: venue.min_capacity || 0,
              max: venue.max_capacity || 0
            },
            pricing: {
              currency: venue.currency || 'SAR',
              startingPrice: venue.starting_price || 0,
              pricePerPerson: venue.price_per_person,
              hourlyRate: venue.hourly_rate
            },
            amenities: venue.amenities || [],
            rating: venue.rating || 0,
            reviews: venue.reviews_count || 0,
            featured: venue.featured || false,
            popular: venue.popular || false,
            availability: venue.availability || [],
            latitude: venue.latitude,
            longitude: venue.longitude,
            parking: venue.parking,
            wifi: venue.wifi,
            accessibilityFeatures: venue.accessibility_features || [],
            acceptedPaymentMethods: venue.accepted_payment_methods || [],
            openingHours: openingHoursData,
            ownerInfo: ownerInfoData,
            additionalServices: venue.additional_services || [],
            rulesAndRegulations: rulesAndRegulationsData,
            type: venue.type || '',           
            zipcode: venue.zipcode || ''      
          } as Venue;
        });
        
        console.log("Transformed venues:", transformedData);
        setVenues(transformedData);
        setTotalCount(count || 0);
      }
      
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [extractFilters]);
  
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
