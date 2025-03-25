
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Generic hook to fetch cities
export const useCities = (featured?: boolean) => {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        let query = supabase.from('cities').select('*');
        
        if (featured !== undefined) {
          query = query.eq('featured', featured);
        }
        
        const { data, error } = await query.order('name');
        
        if (error) {
          throw error;
        }
        
        setCities(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching cities",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [featured, toast]);

  return { cities, loading };
};

// Hook to fetch categories
export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) {
          throw error;
        }
        
        setCategories(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching categories",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [toast]);

  return { categories, loading };
};

// Hook to fetch venues with filtering options
export const useVenues = (filters: {
  cityId?: string;
  categoryId?: string;
  featured?: boolean;
  popular?: boolean;
  priceRange?: [number, number];
  capacity?: [number, number];
  searchTerm?: string;
} = {}) => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        let query = supabase.from('venues').select(`
          *,
          cities!inner(id, name),
          categories!inner(id, name)
        `);
        
        // Apply filters
        if (filters.cityId) {
          query = query.eq('city_id', filters.cityId);
        }
        
        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }
        
        if (filters.featured !== undefined) {
          query = query.eq('featured', filters.featured);
        }
        
        if (filters.popular !== undefined) {
          query = query.eq('popular', filters.popular);
        }
        
        if (filters.priceRange) {
          query = query
            .gte('starting_price', filters.priceRange[0])
            .lte('starting_price', filters.priceRange[1]);
        }
        
        if (filters.capacity) {
          query = query
            .gte('max_capacity', filters.capacity[0])
            .lte('min_capacity', filters.capacity[1]);
        }
        
        if (filters.searchTerm) {
          query = query.ilike('name', `%${filters.searchTerm}%`);
        }
        
        const { data, error } = await query.order('name');
        
        if (error) {
          throw error;
        }
        
        // Transform the data to match the expected format
        const transformedData = data?.map(venue => ({
          id: venue.id,
          name: venue.name,
          description: venue.description,
          imageUrl: venue.image_url,
          galleryImages: venue.gallery_images,
          address: venue.address,
          cityId: venue.city_id,
          city: venue.cities.name,
          categoryId: venue.category_id,
          category: venue.categories.name,
          capacity: {
            min: venue.min_capacity,
            max: venue.max_capacity
          },
          pricing: {
            currency: venue.currency,
            startingPrice: venue.starting_price,
            perPerson: venue.price_per_person
          },
          amenities: venue.amenities || [],
          rating: venue.rating,
          reviewsCount: venue.reviews_count,
          featured: venue.featured,
          popular: venue.popular,
          availability: venue.availability || []
        }));
        
        setVenues(transformedData || []);
      } catch (error: any) {
        toast({
          title: "Error fetching venues",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [filters, toast]);

  return { venues, loading };
};
