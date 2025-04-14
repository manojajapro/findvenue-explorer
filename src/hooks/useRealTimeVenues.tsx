import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Venue, VenueFilter } from '@/hooks/useSupabaseVenues';

const initialVenues: Venue[] = [];

export const useRealTimeVenues = (filter: VenueFilter = {}) => {
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('venues')
      .select('*');

    if (filter.city) {
      query = query.eq('city_name', filter.city);
    }

    if (filter.category) {
      query = query.contains('category_name', [filter.category]);
    }

    if (filter.minCapacity) {
      query = query.gte('max_capacity', filter.minCapacity);
    }

    if (filter.maxPrice) {
      query = query.lte('starting_price', filter.maxPrice);
    }

    if (filter.amenities && filter.amenities.length > 0) {
      filter.amenities.forEach(amenity => {
        query = query.contains('amenities', [amenity]);
      });
    }

    if (filter.priceRange) {
      query = query.gte('starting_price', filter.priceRange[0]).lte('starting_price', filter.priceRange[1]);
    }

    if (filter.capacityRange) {
      query = query.gte('min_capacity', filter.capacityRange[0]).lte('max_capacity', filter.capacityRange[1]);
    }

    if (filter.searchTerm) {
      query = query.ilike('name', `%${filter.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setVenues(data || []);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchVenues();

    const venuesSubscription = supabase
      .channel('venues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        (payload) => {
          console.log('Change received!', payload)
          fetchVenues();
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(venuesSubscription)
    }
  }, [fetchVenues]);

  return { venues, loading, error };
};
