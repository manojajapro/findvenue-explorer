
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VenueCard from '@/components/ui/VenueCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Venue {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  galleryImages: string[];
  address: string;
  city: string;
  cityId: string;
  category: string;
  categoryId: string;
  capacity: {
    min: number;
    max: number;
  };
  pricing: {
    currency: string;
    startingPrice: number;
    pricePerPerson: number;
  };
  amenities: string[];
  rating: number;
  reviews: number;
  featured: boolean;
  popular: boolean;
  availability: string[];
}

interface TopVenuesProps {
  cityId: string;
  cityName: string;
}

const TopVenues = ({ cityId, cityName }: TopVenuesProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('city_id', cityId)
          .limit(4);
          
        if (error) throw error;
        
        // Transform the data to match the expected format
        const transformedData = data.map(venue => ({
          id: venue.id,
          name: venue.name,
          description: venue.description,
          imageUrl: venue.image_url,
          galleryImages: venue.gallery_images || [],
          address: venue.address,
          city: venue.city_name || '',
          cityId: venue.city_id,
          category: venue.category_name || '',
          categoryId: venue.category_id,
          capacity: {
            min: venue.min_capacity,
            max: venue.max_capacity
          },
          pricing: {
            currency: venue.currency,
            startingPrice: venue.starting_price,
            pricePerPerson: venue.price_per_person
          },
          amenities: venue.amenities || [],
          rating: venue.rating,
          reviews: venue.reviews_count,
          featured: venue.featured,
          popular: venue.popular,
          availability: venue.availability || []
        }));
        
        setVenues(transformedData);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (cityId) {
      fetchVenues();
    }
  }, [cityId]);
  
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
          <Link to={`/?cityId=${cityId}`} className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All in {cityName}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))
          ) : venues.length > 0 ? (
            venues.map((venue) => (
              <div key={venue.id} className="h-full">
                <VenueCard venue={venue} featured={venue.featured} />
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-8">
              <p className="text-findvenue-text-muted">No venues found in {cityName}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const VenueCardSkeleton = () => (
  <div className="bg-findvenue-card-bg border border-white/10 rounded-lg overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    </div>
  </div>
);

export default TopVenues;
