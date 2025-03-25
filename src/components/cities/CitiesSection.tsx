
import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saudiCities } from '@/data/cities';
import CityCard from '@/components/ui/CityCard';

const CitiesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Only show featured cities in this section
  const featuredCities = saudiCities.filter(city => city.featured);
  
  return (
    <section ref={sectionRef} className="section-padding reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Discover top event spaces across Saudi Arabia
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              From modern conference centers in Riyadh to beachfront venues in Jeddah, find the perfect location for your next event
            </p>
          </div>
          <Link to="/?view=cities" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All Cities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredCities.map((city) => (
            <div key={city.id} className="h-full">
              <CityCard city={city} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
