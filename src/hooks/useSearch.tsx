
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { venues, Venue } from '@/data/venues';
import { categories } from '@/data/categories';
import { saudiCities } from '@/data/cities';

interface SearchFilters {
  eventType?: string;
  city?: string;
  category?: string;
  guests?: number;
  priceRange?: string;
  amenities?: string[];
}

export const useSearch = () => {
  const [searchParams] = useSearchParams();
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});
  
  // Extract filters from URL parameters - memoized for performance
  const extractFilters = useCallback(() => {
    const filters: SearchFilters = {};
    
    if (searchParams.has('eventType')) {
      filters.eventType = searchParams.get('eventType') || undefined;
    }
    
    if (searchParams.has('city')) {
      filters.city = searchParams.get('city') || undefined;
    }
    
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category') || undefined;
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
  
  // Memoize extracted filters for performance
  const currentFilters = useMemo(() => extractFilters(), [extractFilters]);
  
  // Apply filters to venues
  const applyFilters = useCallback((filters: SearchFilters) => {
    setIsLoading(true);
    
    // Simulate API delay with a shorter timeout - 200ms instead of 500ms
    setTimeout(() => {
      let results = [...venues];
      
      if (filters.city) {
        results = results.filter(venue => venue.cityId === filters.city);
      }
      
      if (filters.category) {
        results = results.filter(venue => venue.categoryId === filters.category);
      }
      
      if (filters.eventType) {
        // Match event type to category
        const matchingCategory = categories.find(
          cat => cat.name.toLowerCase().includes(filters.eventType!.toLowerCase())
        );
        
        if (matchingCategory) {
          results = results.filter(venue => venue.categoryId === matchingCategory.id);
        }
      }
      
      if (filters.guests) {
        results = results.filter(
          venue => venue.capacity.min <= filters.guests! && venue.capacity.max >= filters.guests!
        );
      }
      
      if (filters.priceRange) {
        switch (filters.priceRange) {
          case 'budget':
            results = results.filter(venue => venue.pricing.startingPrice < 15000);
            break;
          case 'mid':
            results = results.filter(
              venue => venue.pricing.startingPrice >= 15000 && venue.pricing.startingPrice < 30000
            );
            break;
          case 'luxury':
            results = results.filter(venue => venue.pricing.startingPrice >= 30000);
            break;
        }
      }
      
      if (filters.amenities && filters.amenities.length > 0) {
        results = results.filter(venue => 
          filters.amenities!.every(amenity => 
            venue.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
          )
        );
      }
      
      setFilteredVenues(results);
      setIsLoading(false);
    }, 200); // Reduced from 500ms to 200ms for faster response
  }, []);
  
  // Update filters and results when URL parameters change
  useEffect(() => {
    const filters = currentFilters;
    setActiveFilters(filters);
    applyFilters(filters);
  }, [currentFilters, applyFilters]);
  
  // Get category and city info based on IDs
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '';
  }, []);
  
  const getCityName = useCallback((cityId: string) => {
    const city = saudiCities.find(c => c.id === cityId);
    return city ? city.name : '';
  }, []);
  
  return {
    venues: filteredVenues,
    isLoading,
    filters: activeFilters,
    getCategoryName,
    getCityName
  };
};
