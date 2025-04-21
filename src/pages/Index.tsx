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
import HomePageMap from '@/components/map/HomePageMap';
import HomepageChatbot from '@/components/chat/HomepageChatbot';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { venues, isLoading, filters } = useSearch();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);
  
  const hasFilters = Object.keys(filters).length > 0;
  
  useEffect(() => {
    if (searchParams.has('view')) {
      setActiveView(searchParams.get('view'));
    } else {
      setActiveView(null);
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (hasFilters) {
      console.log('Filters detected, redirecting to venues page:', filters);
      const currentParams = new URLSearchParams(searchParams);
      
      if (currentParams.has('eventType')) {
        const eventType = currentParams.get('eventType') || '';
        if (!eventType.match(/^[a-z0-9-_]+$/)) {
          currentParams.set('search', eventType);
          currentParams.delete('eventType');
        }
      }
      
      if (currentParams.has('location')) {
        const location = currentParams.get('location') || '';
        currentParams.set('search', location);
        currentParams.delete('location');
      }
      
      currentParams.set('view', 'map');
      
      navigate(`/venues?${currentParams.toString()}`);
    }
  }, [hasFilters, searchParams, navigate]);

  useEffect(() => {
    const showMapParam = searchParams.get('showMap');
    setShowMap(showMapParam === 'true');
  }, [searchParams]);
  
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
      <HomepageChatbot />
      <HeroSection />
      
      <div id="find-venues-map" className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Find Venues on Map</h2>
          <p className="text-findvenue-text-muted">
            Explore venues visually and find the perfect location for your event
          </p>
        </div>
        <HomePageMap height="550px" />
      </div>
      
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
