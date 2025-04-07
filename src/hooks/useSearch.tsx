
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const isSearchInProgress = useRef(false);
  const prevFiltersRef = useRef<string | null>(null);
  
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
  
  // Function to update search params without causing a route change
  const updateSearchParams = useCallback((filters: SearchFilters) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Compare current filters with previous filters
    const filtersStr = JSON.stringify(filters);
    if (filtersStr === prevFiltersRef.current) {
      return; // Skip if filters haven't changed
    }
    prevFiltersRef.current = filtersStr;
    
    // Update all params at once to avoid multiple history entries
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, String(value));
      }
    });
    
    // Use replace state to avoid creating new history entries
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Apply filters to venues with improved debounce mechanism
  const applyFilters = useCallback((filters: SearchFilters) => {
    // Prevent multiple concurrent searches
    if (isSearchInProgress.current) {
      return;
    }
    
    isSearchInProgress.current = true;
    setIsLoading(true);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Use a stable search key to prevent duplicate searches
    const searchKey = JSON.stringify(filters);
    if (searchKey === lastSearchRef.current) {
      setIsLoading(false);
      isSearchInProgress.current = false;
      return;
    }
    
    lastSearchRef.current = searchKey;
    
    // Use a longer delay for better debounce
    searchTimeoutRef.current = setTimeout(() => {
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
      isSearchInProgress.current = false;
      
      // Update search params after filtering is complete
      updateSearchParams(filters);
    }, 500); // Increased debounce delay
  }, [updateSearchParams]);
  
  // Update filters and results when URL parameters change
  useEffect(() => {
    // Skip the first render to prevent unnecessary searches on mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const filters = currentFilters;
      setActiveFilters(filters);
      applyFilters(filters);
      return;
    }
    
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
