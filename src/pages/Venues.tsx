
import { useSearchParams } from 'react-router-dom';
import VenuesList from '@/components/venues/VenuesList';

const Venues = () => {
  const [searchParams] = useSearchParams();
  const hasFilters = searchParams.toString().length > 0;
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Venues</h1>
          <p className="text-findvenue-text-muted">
            Browse our collection of premium venues for your next event
          </p>
        </div>
        
        <VenuesList />
      </div>
    </div>
  );
};

export default Venues;
