
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Venue } from '@/hooks/useSupabaseVenues';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
}

interface UseRealTimeVenuesReturn {
  venues: Venue[];
  categories: Category[];
  cities: City[];
  isLoading: boolean;
  totalCount: number;
}

export const useRealTimeVenues = (): UseRealTimeVenuesReturn => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams] = useSearchParams();

  // Process filter params from URL
  const getFilters = useCallback(() => {
    const categoryId = searchParams.get('categoryId');
    const cityId = searchParams.get('cityId');
    const searchTerm = searchParams.get('search');
    const venueType = searchParams.get('type');
    const guests = searchParams.get('guests') ? parseInt(searchParams.get('guests') || '0', 10) : null;

    return {
      categoryId,
      cityId,
      searchTerm,
      venueType,
      guests
    };
  }, [searchParams]);

  // Fetch venues with filters
  const fetchVenues = useCallback(async () => {
    setIsLoading(true);
    
    const filters = getFilters();
    console.info('Fetching venues with filters:', filters);
    
    try {
      // Start with base query
      let query = supabase
        .from('venues')
        .select('*');
      
      // Apply filters
      if (filters.categoryId) {
        // For array values, use contains operator
        query = query.contains('category_id', [filters.categoryId]);
      }
      
      if (filters.cityId) {
        query = query.eq('city_id', filters.cityId);
      }
      
      if (filters.venueType) {
        query = query.eq('type', filters.venueType);
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%,city_name.ilike.%${filters.searchTerm}%`);
      }

      if (filters.guests) {
        query = query.and(`min_capacity.lte.${filters.guests},max_capacity.gte.${filters.guests}`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const processedVenues: Venue[] = data.map(v => ({
          id: v.id,
          name: v.name,
          description: v.description || '',
          address: v.address,
          city: v.city_name,
          cityId: v.city_id,
          category: v.category_name || [],
          categoryId: v.category_id || [],
          imageUrl: v.image_url || (v.gallery_images && v.gallery_images.length > 0 ? v.gallery_images[0] : undefined),
          galleryImages: v.gallery_images,
          type: v.type || 'Standard', // Ensure type is always defined
          capacity: {
            min: typeof v.min_capacity === 'number' ? v.min_capacity : 0,
            max: typeof v.max_capacity === 'number' ? v.max_capacity : 0
          },
          pricing: {
            startingPrice: typeof v.starting_price === 'number' ? v.starting_price : 0,
            pricePerPerson: v.price_per_person,
            currency: v.currency || 'SAR'
          },
          amenities: v.amenities || [],
          rating: v.rating || 0,
          reviews: v.reviews_count || 0,
          featured: v.featured || false,
          popular: v.popular || false,
          latitude: v.latitude,
          longitude: v.longitude,
          availability: v.availability || [],
          parking: v.parking || false,
          wifi: v.wifi || true,
          accessibilityFeatures: v.accessibility_features || [],
          acceptedPaymentMethods: v.accepted_payment_methods || [],
          additionalServices: v.additional_services || [],
          zipcode: v.zipcode
        }));

        console.log('Processed venues:', processedVenues);
        setVenues(processedVenues);
        setTotalCount(count || processedVenues.length);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      // Use empty array as fallback
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [getFilters]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data: categoriesData, error } = await supabase
        .from('venues')
        .select('category_id, category_name')
        .not('category_id', 'is', null);

      if (error) throw error;

      if (categoriesData) {
        const processedCategories: Category[] = [];
        const uniqueCategories = new Map<string, boolean>();

        categoriesData.forEach(item => {
          if (Array.isArray(item.category_id) && Array.isArray(item.category_name)) {
            item.category_id.forEach((catId, index) => {
              if (catId && !uniqueCategories.has(catId)) {
                uniqueCategories.set(catId, true);
                processedCategories.push({
                  id: catId,
                  name: item.category_name[index] || 'Unnamed Category'
                });
              }
            });
          }
        });

        setCategories(processedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  }, []);

  // Fetch cities
  const fetchCities = useCallback(async () => {
    try {
      const { data: citiesData, error } = await supabase
        .from('venues')
        .select('city_id, city_name')
        .not('city_id', 'is', null);

      if (error) throw error;

      if (citiesData) {
        const processedCities: City[] = [];
        const uniqueCities = new Map<string, boolean>();

        citiesData.forEach(item => {
          if (item.city_id && item.city_name && !uniqueCities.has(item.city_id)) {
            uniqueCities.set(item.city_id, true);
            processedCities.push({
              id: item.city_id,
              name: item.city_name
            });
          }
        });

        setCities(processedCities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    }
  }, []);

  // Initial data load and subscription setup
  useEffect(() => {
    console.log("Running useRealTimeVenues effect to fetch data");
    fetchVenues();
    fetchCategories();
    fetchCities();

    // Set up real-time subscription for venues table
    const channel = supabase
      .channel('venue-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchVenues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVenues, fetchCategories, fetchCities, searchParams]); // Add searchParams to dependencies

  return {
    venues,
    categories,
    cities,
    isLoading,
    totalCount
  };
};
