
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CityCard from '@/components/ui/CityCard';
import { supabase } from '@/integrations/supabase/client';

const CitiesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [featuredCities, setFeaturedCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setIsLoading(true);
        
        // First try to get the pre-aggregated city data
        const { data: cityGroupsData, error: cityGroupsError } = await supabase
          .from('city_groups')
          .select('*')
          .limit(4); // Limit to 4 cities for the featured section
          
        if (cityGroupsError) {
          console.error('Error fetching city groups:', cityGroupsError);
          
          // Fallback: Get all venues to extract unique cities
          const { data: venuesData, error: venuesError } = await supabase
            .from('venues')
            .select('city_id, city_name, gallery_images')
            .limit(30);
            
          if (venuesError) throw venuesError;
          
          if (venuesData) {
            // Process cities data to avoid duplicates
            const uniqueCities = new Map();
            
            venuesData.forEach(venue => {
              if (!venue.city_id) return; // Skip venues without city_id
              
              // Create or update city entry
              if (!uniqueCities.has(venue.city_id)) {
                uniqueCities.set(venue.city_id, {
                  id: venue.city_id,
                  name: venue.city_name || 'Unknown City',
                  gallery_images: venue.gallery_images || [],
                  venueCount: 1,
                  featured: true
                });
              } else {
                // Update existing city with better data if available
                const existingCity = uniqueCities.get(venue.city_id);
                existingCity.venueCount += 1;
                
                // Update gallery_images if the current city doesn't have any
                if ((!existingCity.gallery_images || existingCity.gallery_images.length === 0) && 
                    venue.gallery_images && venue.gallery_images.length > 0) {
                  existingCity.gallery_images = venue.gallery_images;
                }
                
                uniqueCities.set(venue.city_id, existingCity);
              }
            });
            
            const citiesData = Array.from(uniqueCities.values()).slice(0, 4); // Limit to 4 cities
            setFeaturedCities(citiesData);
          }
        } else if (cityGroupsData && cityGroupsData.length > 0) {
          // Use pre-aggregated city data from the database
          const formattedCities = cityGroupsData.map(city => ({
            id: city.city_id,
            name: city.city_name,
            gallery_images: city.image_url ? [city.image_url] : [],
            venueCount: city.venue_count || 0,
            featured: true
          }));
          
          setFeaturedCities(formattedCities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCities();
  }, []);
  
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
          <Link to="/cities" className="mt-4 md:mt-0">
            <Button variant="outline" className="border-findvenue text-findvenue hover:bg-findvenue/10">
              View All Cities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            // Show placeholders while loading
            [...Array(4)].map((_, index) => (
              <div key={index} className="h-64 bg-findvenue-surface/30 animate-pulse rounded-lg"></div>
            ))
          ) : (
            featuredCities.map((city) => (
              <div key={city.id} className="h-full">
                <CityCard city={city} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
