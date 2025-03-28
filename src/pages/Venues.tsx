import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import VenuesList from '@/components/venues/VenuesList';
import MapView from '@/components/map/MapView';
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, List, MapIcon, Filter, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { venues, categories, cities, isLoading, totalCount } = useSupabaseVenues();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(searchParams.get('view') as 'list' | 'map' || 'list');
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const categoryId = searchParams.get('categoryId');
  const cityId = searchParams.get('cityId');
  const hasFilters = searchParams.toString().length > 0;
  
  const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : '';
  const cityName = cityId ? cities.find(c => c.id === cityId)?.name : '';
  
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
  
  useEffect(() => {
    const currentViewInUrl = searchParams.get('view');
    if (viewMode !== currentViewInUrl && (viewMode === 'list' || viewMode === 'map')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('view', viewMode);
      setSearchParams(newParams);
    }
  }, [viewMode, searchParams, setSearchParams]);
  
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as 'list' | 'map' | null;
    if (viewFromUrl && (viewFromUrl === 'list' || viewFromUrl === 'map')) {
      setViewMode(viewFromUrl);
    }
  }, [searchParams]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('search', searchTerm.trim());
      setSearchParams(newParams);
    }
  };
  
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchTerm('');
  };

  const handleVenueMouseEnter = useCallback((venueId: string) => {
    setHoveredVenueId(venueId);
  }, []);
  
  const handleVenueMouseLeave = useCallback(() => {
    setHoveredVenueId(null);
  }, []);
  
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
        
        <Card className="mb-8 p-4 bg-findvenue-surface/30 border-white/10">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search venues by name, features, or location..."
                className="pl-10 bg-findvenue-surface/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-findvenue hover:bg-findvenue-dark">
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
              {hasFilters && (
                <Button variant="outline" className="border-white/10" onClick={clearFilters}>
                  <Filter className="h-4 w-4 mr-2" /> Clear Filters
                </Button>
              )}
            </div>
          </form>
          
          {hasFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchParams.get('search') && (
                <Badge variant="outline" className="bg-findvenue-surface/50 border-white/20">
                  Search: {searchParams.get('search')}
                  <button 
                    className="ml-2"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('search');
                      setSearchParams(newParams);
                      setSearchTerm('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {categoryName && (
                <Badge variant="outline" className="bg-findvenue-surface/50 border-white/20">
                  Category: {categoryName}
                  <button 
                    className="ml-2"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('categoryId');
                      setSearchParams(newParams);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {cityName && (
                <Badge variant="outline" className="bg-findvenue-surface/50 border-white/20">
                  City: {cityName}
                  <button 
                    className="ml-2"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('cityId');
                      setSearchParams(newParams);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </Card>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-findvenue-text-muted">
              {isLoading ? 'Searching venues...' : `Found ${venues.length} venues`}
            </p>
          </div>
          
          <Tabs 
            value={viewMode} 
            onValueChange={(value) => setViewMode(value as 'list' | 'map')}
            className="w-auto"
          >
            <TabsList className="bg-findvenue-surface/50 border border-white/10">
              <TabsTrigger value="list" className="data-[state=active]:bg-findvenue data-[state=active]:text-white">
                <List className="h-4 w-4 mr-2" /> List
              </TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-findvenue data-[state=active]:text-white">
                <MapIcon className="h-4 w-4 mr-2" /> Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {viewMode === "list" ? (
          <div>
            <VenuesList 
              onVenueMouseEnter={handleVenueMouseEnter}
              onVenueMouseLeave={handleVenueMouseLeave}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3">
              <VenuesList 
                compact={true} 
                onVenueMouseEnter={handleVenueMouseEnter}
                onVenueMouseLeave={handleVenueMouseLeave}
              />
            </div>
            <div className="w-full lg:w-2/3 h-[650px] rounded-lg overflow-hidden border border-white/10 shadow-lg">
              <MapView 
                venues={venues} 
                isLoading={isLoading} 
                highlightedVenueId={hoveredVenueId || undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Venues;
