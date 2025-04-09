
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Venue, VenueFilter } from '@/hooks/useSupabaseVenues';

export const useRealTimeVenues = () => {
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string, venue_count: number, image_url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Memoize filter extraction to prevent unnecessary rerenders
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
  
  // Memoize the current filters to use in dependency arrays
  const currentFilters = useMemo(() => extractFilters(), [extractFilters]);
  
  const transformVenueData = useCallback((data: any[]): Venue[] => {
    return data.map(venue => {
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
            user_id: ownerInfo.user_id || ''
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

      // Use first gallery image instead of image_url
      const defaultImage = venue.gallery_images && venue.gallery_images.length > 0 
        ? venue.gallery_images[0] 
        : '';
      
      return {
        id: venue.id,
        name: venue.name,
        description: venue.description || '',
        imageUrl: defaultImage, // Use first gallery image
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
          pricePerPerson: venue.price_per_person
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
  }, []);
  
  const fetchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = currentFilters;
      const searchTerm = searchParams.get('search') || '';
      
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
      
      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      // Remove the limit to fetch all venues
      const { data, error: venuesError, count } = await query;
      
      if (venuesError) throw venuesError;
      
      if (data) {
        const transformedData = transformVenueData(data);
        setVenues(transformedData);
        setTotalCount(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, searchParams, transformVenueData]);
  
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: categoriesError } = await supabase
        .from('category_groups')
        .select('*');
      
      if (categoriesError) throw categoriesError;
      
      if (data) {
        setCategories(data.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          venue_count: cat.venue_count,
          image_url: cat.image_url
        })));
      }
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
      
      if (data) {
        setCities(data.map(city => ({
          id: city.city_id,
          name: city.city_name,
          venue_count: city.venue_count,
          image_url: city.image_url
        })));
      }
    } catch (error: any) {
      console.error('Error fetching cities:', error);
    }
  }, []);
  
  // Set up real-time subscriptions once
  useEffect(() => {
    fetchVenues();
    fetchCategories();
    fetchCities();
    
    // Set up real-time subscription for venues
    const venuesChannel = supabase
      .channel('public:venues')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'venues' }, 
        () => {
          console.log('Venues updated, refreshing data');
          fetchVenues();
        }
      )
      .subscribe();
      
    // Set up subscription for categories
    const categoriesChannel = supabase
      .channel('public:category_groups')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'category_groups' }, 
        () => {
          console.log('Categories updated, refreshing data');
          fetchCategories();
        }
      )
      .subscribe();
      
    // Set up subscription for cities
    const citiesChannel = supabase
      .channel('public:city_groups')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'city_groups' }, 
        () => {
          console.log('Cities updated, refreshing data');
          fetchCities();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(venuesChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(citiesChannel);
    };
  }, []); // This runs only once on component mount
  
  // Re-fetch data when search params change
  useEffect(() => {
    fetchVenues();
  }, [searchParams, fetchVenues]);
  
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
