
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import VenuesList from '@/components/venues/VenuesList';
import MapView from '@/components/map/MapView';
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { venues, categories, cities, isLoading, totalCount } = useSupabaseVenues();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Get filter parameters from URL
  const categoryId = searchParams.get('categoryId');
  const cityId = searchParams.get('cityId');
  const hasFilters = searchParams.toString().length > 0;
  
  // Find category/city names for display
  const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : '';
  const cityName = cityId ? cities.find(c => c.id === cityId)?.name : '';
  
  // Set page title based on filters
  useEffect(() => {
    if (categoryName && cityName) {
      document.title = `${categoryName} venues in ${cityName} | FindVenue`;
    } else if (categoryName) {
      document.title = `${categoryName} venues | FindVenue`;
    } else if (cityName) {
      document.title = `Venues in ${cityName} | FindVenue`;
    } else {
      document.title = 'All Venues | FindVenue';
    }
  }, [categoryName, cityName]);
  
  // Auto-search with debounced term
  useEffect(() => {
    if (debouncedSearchTerm !== searchParams.get('search')) {
      const newParams = new URLSearchParams(searchParams);
      
      if (debouncedSearchTerm.trim()) {
        newParams.set('search', debouncedSearchTerm.trim());
      } else {
        newParams.delete('search');
      }
      
      setSearchParams(newParams);
    }
  }, [debouncedSearchTerm, searchParams, setSearchParams]);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('search', searchTerm.trim());
      setSearchParams(newParams);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchTerm('');
  };
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {categoryName && `${categoryName} `}
            {cityName ? `Venues in ${cityName}` : categoryName ? 'Venues' : 'All Venues'}
          </h1>
          <p className="text-findvenue-text-muted">
            {hasFilters 
              ? `Browse our collection of venues${categoryName ? ` for ${categoryName.toLowerCase()}` : ''}${cityName ? ` in ${cityName}` : ''}`
              : 'Browse our collection of premium venues for your next event'
            }
          </p>
        </div>
        
        {/* Search bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search venues by name, features, or location..."
                className="pl-10 bg-findvenue-surface/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" className="bg-findvenue hover:bg-findvenue-dark">
              Search
            </Button>
            {hasFilters && (
              <Button variant="outline" className="border-white/10" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </form>
        </div>
        
        {/* View toggle */}
        <div className="mb-4">
          <Tabs 
            value={viewMode} 
            onValueChange={(value) => setViewMode(value as 'list' | 'map')}
            className="w-full"
          >
            <TabsList className="grid w-[200px] grid-cols-2 mb-4">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="map">Map View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-0">
              <VenuesList />
            </TabsContent>
            
            <TabsContent value="map" className="mt-0">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/3">
                  <VenuesList compact={true} />
                </div>
                <div className="w-full lg:w-2/3 h-[600px] rounded-lg overflow-hidden border border-white/10">
                  <MapView venues={venues} isLoading={isLoading} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Venues;
