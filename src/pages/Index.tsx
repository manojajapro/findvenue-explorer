
import React, { useRef } from 'react';
import HeroSection from '@/components/hero/HeroSection';
import TopVenues from '@/components/venues/TopVenues';
import AdviceSection from '@/components/advice/AdviceSection';
import CitiesSection from '@/components/cities/CitiesSection';
import CategoriesSection from '@/components/categories/CategoriesSection';
import PopularVenues from '@/components/venues/PopularVenues';
import MapSearchSection from '@/components/map/MapSearchSection';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const IndexPage: React.FC = () => {
  const mapSectionRef = useRef<HTMLDivElement>(null);
  
  const scrollToMapSection = () => {
    mapSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };
  
  return (
    <div className="min-h-screen">
      <HeroSection onExploreMap={scrollToMapSection} />
      <TopVenues />
      <div ref={mapSectionRef} id="map-section">
        <MapSearchSection />
      </div>
      <PopularVenues />
      <CategoriesSection />
      <CitiesSection />
      <AdviceSection />
    </div>
  );
};

export default IndexPage;
