
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { GridIcon, List, MapIcon } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
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
  
  // Redirect to venues page with map view when search filters are applied
  useEffect(() => {
    if (hasFilters) {
      const currentParams = new URLSearchParams(searchParams);
      currentParams.set('view', 'map');
      navigate(`/venues?${currentParams.toString()}`);
    }
  }, [hasFilters, searchParams, navigate]);
  
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
