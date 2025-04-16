
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Venue, VenueFilter } from '@/types/global';
import { data as categoriesData } from '@/data/categories';
import { data as citiesData } from '@/data/cities';

// Type definition for what the hook returns
interface UseRealTimeVenuesReturn {
  venues: Venue[];
  isLoading: boolean;
  error: string | null;
  categories: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  totalCount: number;
}

export const useRealTimeVenues = (filters?: VenueFilter): UseRealTimeVenuesReturn => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Use static data for categories and cities
  const categories = categoriesData;
  const cities = citiesData;

  useEffect(() => {
    const fetchVenues = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase.from('venues').select('*');

        if (filters) {
          // Apply filters
          if (filters.cityId) {
            query = query.eq('city_id', filters.cityId);
          }

          if (filters.category) {
            query = query.contains('category_id', [filters.category]);
          }

          if (filters.minCapacity) {
            query = query.gte('min_capacity', filters.minCapacity);
          }

          if (filters.maxPrice) {
            query = query.lte('starting_price', filters.maxPrice);
          }
          
          if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`);
          }

          if (filters.type && typeof filters.type === 'string') {
            query = query.eq('type', filters.type);
          }
        }

        const { data, error: fetchError, count } = await query.select('count', { count: 'exact' });

        if (fetchError) throw fetchError;

        if (data) {
          // Map the database data to the Venue type, ensuring all required fields are present
          const mappedVenues: Venue[] = data.map(venue => ({
            id: venue.id,
            name: venue.name,
            description: venue.description || '',
            city: venue.city_name || '',
            cityId: venue.city_id || '',
            address: venue.address || '',
            rating: venue.rating || 0,
            reviewsCount: venue.reviews_count || 0,
            minPrice: venue.starting_price || 0,
            imageUrl: venue.image_url || '/placeholder.svg',
            images: venue.gallery_images || [],
            capacity: {
              min: venue.min_capacity || 1,
              max: venue.max_capacity || 100
            },
            popular: venue.popular || false,
            featured: venue.featured || false,
            isRecentlyAdded: false,
            amenities: venue.amenities || [],
            lat: venue.latitude || null,
            lng: venue.longitude || null,
            type: venue.type || '', // Ensure type is mapped
            categories: venue.category_name || []
          }));
          
          setVenues(mappedVenues);
          setTotalCount(count || 0);
        }
      } catch (err) {
        console.error("Error fetching venues:", err);
        setError('Failed to fetch venues');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenues();

    // Set up real-time subscription
    const subscription = supabase
      .channel('venues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, fetchVenues)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filters]);

  return { venues, isLoading, error, categories, cities, totalCount };
};
