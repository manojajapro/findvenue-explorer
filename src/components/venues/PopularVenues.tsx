
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VenueCard from '@/components/ui/VenueCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Venue } from '@/hooks/useSupabaseVenues';

const PopularVenues = () => {
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
          .eq('city_id', 'riyadh')
          .eq('popular', true)
          .limit(4);
          
        if (error) throw error;
        
        // Transform the data to match the expected format
        const transformedData = data.map(venue => {
          // Use first gallery image as the image URL
          const defaultImage = venue.gallery_images && venue.gallery_images.length > 0 
            ? venue.gallery_images[0] 
            : '';
            
          return {
            id: venue.id,
            name: venue.name,
            description: venue.description || '',
            imageUrl: defaultImage, // Use first gallery image
            galleryImages: venue.gallery_images || [],
            address: venue.address || '',
            city: venue.city_name || '',
            cityId: venue.city_id || '',
            category: venue.category_name || [],
            categoryId: venue.category_id || [],
            capacity: {
              min: venue.min_capacity || 0,
              max: venue.max_capacity || 0
            },
            pricing: {
              currency: venue.currency || 'SAR',
              startingPrice: venue.starting_price || 0,
              pricePerPerson: venue.price_per_person || 0
            },
            amenities: venue.amenities || [],
            rating: venue.rating || 0,
            reviews: venue.reviews_count || 0,
            featured: venue.featured || false,
            popular: venue.popular || false,
            availability: venue.availability || []
          }
        });
        
        setVenues(transformedData);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVenues();
  }, []);
  
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
          <Link to="/venues?cityId=riyadh&view=map" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All in Riyadh
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
              <p className="text-findvenue-text-muted">No popular venues found in Riyadh</p>
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

export default PopularVenues;
