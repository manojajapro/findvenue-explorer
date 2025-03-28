
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeroSection from '@/components/hero/HeroSection';
import CitiesSection from '@/components/cities/CitiesSection';
import CategoriesSection from '@/components/categories/CategoriesSection';
import PopularVenues from '@/components/venues/PopularVenues';
import TopVenues from '@/components/venues/TopVenues';
import GlobalVenues from '@/components/global/GlobalVenues';
import AdviceSection from '@/components/advice/AdviceSection';
import { useSearch } from '@/hooks/useSearch';
import { VenueCard } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GridIcon, List } from 'lucide-react';

const Index = () => {
  const [searchParams] = useSearchParams();
  const { venues, isLoading, filters } = useSearch();
  const [activeView, setActiveView] = useState<string | null>(null);
  
  const hasFilters = Object.keys(filters).length > 0;
  
  useEffect(() => {
    if (searchParams.has('view')) {
      setActiveView(searchParams.get('view'));
    } else {
      setActiveView(null);
    }
  }, [searchParams]);
  
  if (hasFilters) {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Search Results</h1>
            <p className="text-findvenue-text-muted">
              Found {venues.length} venues {filters.city ? `in ${filters.city}` : ''}
              {filters.eventType ? ` for ${filters.eventType}` : ''}
              {filters.guests ? ` with capacity for ${filters.guests} guests` : ''}
            </p>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-findvenue-text-muted">
                Showing {venues.length} results
              </p>
            </div>
            
            <Tabs defaultValue="grid" className="w-auto">
              <TabsList className="bg-findvenue-surface/50">
                <TabsTrigger value="grid">
                  <GridIcon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              
              {/* Make sure TabsContent is inside Tabs component */}
              <TabsContent value="grid" className="hidden">
                {/* Grid content */}
              </TabsContent>
              <TabsContent value="list" className="hidden">
                {/* List content */}
              </TabsContent>
            </Tabs>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-findvenue-surface/50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : venues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {venues.map((venue) => (
                <div key={venue.id} className="h-full">
                  <VenueCard venue={venue} featured={venue.featured} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-xl font-medium mb-2">No venues found</h3>
              <p className="text-findvenue-text-muted mb-6">
                Try adjusting your search filters to find more options
              </p>
              <Button
                className="bg-findvenue hover:bg-findvenue-dark"
                onClick={() => window.history.pushState({}, '', '/')}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (activeView === 'categories') {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Venue Categories</h1>
            <p className="text-findvenue-text-muted max-w-2xl mx-auto">
              Explore our venues by category to find the perfect space for your event needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {/* We would render all categories here */}
          </div>
        </div>
      </div>
    );
  }
  
  if (activeView === 'cities') {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Explore Cities</h1>
            <p className="text-findvenue-text-muted max-w-2xl mx-auto">
              Discover venue options in cities across Saudi Arabia
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* We would render all cities here */}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <HeroSection />
      <CitiesSection />
      <CategoriesSection />
      <PopularVenues />
      <TopVenues cityId="jeddah" cityName="Jeddah" />
      <GlobalVenues />
      <AdviceSection />
    </>
  );
};

export default Index;
