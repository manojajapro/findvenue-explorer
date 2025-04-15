
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Venue, VenueFilter } from '@/hooks/useSupabaseVenues';
import { useSearchParams } from 'react-router-dom';

const initialVenues: Venue[] = [];

export const useRealTimeVenues = (filter: VenueFilter = {}) => {
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [cities, setCities] = useState<Array<{id: string, name: string}>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams] = useSearchParams();

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get filters from URL params
      const categoryId = searchParams.get('categoryId');
      const cityId = searchParams.get('cityId');
      const searchTerm = searchParams.get('search');
      const venueType = searchParams.get('type');

      console.log('Fetching venues with filters:', { categoryId, cityId, searchTerm, venueType });

      let query = supabase
        .from('venues')
        .select('*');

      // Apply URL parameter filters if they exist
      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      if (categoryId) {
        // For categoryId we need to check if it's contained in the array
        query = query.contains('category_id', [categoryId]);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (venueType) {
        query = query.eq('type', venueType);
      }

      // Apply other filters from props
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

      const { data, error: venuesError } = await query;
      console.log('Venues data fetched:', data?.length, 'venues');

      if (venuesError) {
        throw venuesError;
      }

      // Process venue data to ensure all required properties exist with fallbacks
      const processedVenues = data?.map(venue => {
        return {
          id: venue.id,
          name: venue.name || 'Unnamed Venue',
          description: venue.description || '',
          address: venue.address || '',
          city: venue.city_name || '',
          cityId: venue.city_id || '',
          category: venue.category_name || [],
          categoryId: venue.category_id || [],
          imageUrl: venue.image_url || '',
          galleryImages: venue.gallery_images || [],
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
          latitude: venue.latitude,
          longitude: venue.longitude,
          type: venue.type || 'Standard', // Ensure type is always present
        };
      }) || [];

      setVenues(processedVenues);
      setTotalCount(processedVenues.length);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('venues')
        .select('category_id, category_name')
        .not('category_id', 'is', null);

      if (categoriesData) {
        const uniqueCategories = new Map();
        categoriesData.forEach(item => {
          if (item.category_id && item.category_name) {
            // Handle both array and string cases for categories
            const categoryIds = Array.isArray(item.category_id) ? item.category_id : [item.category_id];
            const categoryNames = Array.isArray(item.category_name) ? item.category_name : [item.category_name];
            
            categoryIds.forEach((id, index) => {
              if (id && categoryNames[index]) {
                uniqueCategories.set(id, { id, name: categoryNames[index] });
              }
            });
          }
        });
        
        setCategories(Array.from(uniqueCategories.values()));
      }

      // Fetch cities
      const { data: citiesData } = await supabase
        .from('venues')
        .select('city_id, city_name')
        .not('city_id', 'is', null);

      if (citiesData) {
        const uniqueCities = new Map();
        citiesData.forEach(item => {
          if (item.city_id && item.city_name) {
            uniqueCities.set(item.city_id, { id: item.city_id, name: item.city_name });
          }
        });
        
        setCities(Array.from(uniqueCities.values()));
      }
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filter, searchParams]);

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

  return { venues, loading, error, categories, cities, isLoading: loading, totalCount };
};
