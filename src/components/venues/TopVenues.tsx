
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVenuesByCity } from '@/data/venues';
import VenueCard from '@/components/ui/VenueCard';

interface TopVenuesProps {
  cityId: string;
  cityName: string;
}

const TopVenues = ({ cityId, cityName }: TopVenuesProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Get venues for the specified city
  const cityVenues = getVenuesByCity(cityId);
  
  return (
    <section ref={sectionRef} className="section-padding bg-findvenue-surface/10 reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Top event venues available in {cityName}
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              Explore the finest venues with premium amenities and exceptional service
            </p>
          </div>
          <Link to={`/?city=${cityId}`} className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All in {cityName}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cityVenues.slice(0, 4).map((venue) => (
            <div key={venue.id} className="h-full">
              <VenueCard venue={venue} featured={venue.featured} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopVenues;
