
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVenuesByCity, getPopularVenues } from '@/data/venues';
import VenueCard from '@/components/ui/VenueCard';

const PopularVenues = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Get popular venues in Riyadh
  const riyadhVenues = getVenuesByCity('riyadh').filter(venue => venue.popular);
  
  return (
    <section ref={sectionRef} className="section-padding reveal">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Popular venues for hire in Riyadh
            </h2>
            <p className="text-findvenue-text-muted max-w-2xl">
              Discover our most sought-after venues in Saudi Arabia's capital city
            </p>
          </div>
          <Link to="/?city=riyadh" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All in Riyadh
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {riyadhVenues.slice(0, 4).map((venue) => (
            <div key={venue.id} className="h-full">
              <VenueCard venue={venue} featured={venue.featured} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularVenues;
