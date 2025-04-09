
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import CityCard from '@/components/ui/CityCard';

const Cities = () => {
  const [cities, setCities] = useState<any[]>([]);
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setIsLoading(true);
        
        // Get all venues to extract unique cities
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('city_id, city_name, gallery_images')
          .order('city_name', { ascending: true });
          
        if (venuesError) throw venuesError;
        
        if (venuesData) {
          // Process cities data to avoid duplicates and prefer gallery_images
          const uniqueCities = new Map();
          
          venuesData.forEach(venue => {
            if (!venue.city_id) return; // Skip venues without city_id
            
            // Skip if this city is already processed and has gallery images
            if (uniqueCities.has(venue.city_id) && 
                uniqueCities.get(venue.city_id).gallery_images &&
                uniqueCities.get(venue.city_id).gallery_images.length > 0) {
              // Just increment the venue count
              const existingCity = uniqueCities.get(venue.city_id);
              existingCity.venue_count += 1;
              uniqueCities.set(venue.city_id, existingCity);
              return;
            }
            
            // Use gallery_images if available
            const imageSource = venue.gallery_images && venue.gallery_images.length > 0 
              ? venue.gallery_images[0] 
              : '';
            
            // Create or update city entry
            if (!uniqueCities.has(venue.city_id)) {
              uniqueCities.set(venue.city_id, {
                id: venue.city_id,
                name: venue.city_name || 'Unknown City',
                gallery_images: venue.gallery_images || [],
                venue_count: 1
              });
            } else {
              // Update existing city with better data if available
              const existingCity = uniqueCities.get(venue.city_id);
              existingCity.venue_count += 1;
              
              // Update gallery_images if the current city doesn't have any
              if ((!existingCity.gallery_images || existingCity.gallery_images.length === 0) && 
                  venue.gallery_images && venue.gallery_images.length > 0) {
                existingCity.gallery_images = venue.gallery_images;
              }
              
              uniqueCities.set(venue.city_id, existingCity);
            }
          });
          
          const citiesData = Array.from(uniqueCities.values());
          console.log("Unique cities:", citiesData);
          
          setCities(citiesData);
          setFilteredCities(citiesData);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCities();
  }, []);
  
  // Filter cities based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCities(cities);
      return;
    }
    
    const filtered = cities.filter(city => 
      city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredCities(filtered);
  }, [searchTerm, cities]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Explore Cities</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto mb-8">
            Discover venue options in cities across Saudi Arabia
          </p>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search cities..."
                className="pl-10 bg-findvenue-surface/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <CitySkeleton key={index} />
            ))}
          </div>
        ) : filteredCities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCities.map((city) => (
              <div key={city.id} className="h-full">
                <CityCard
                  city={{
                    id: city.id,
                    name: city.name,
                    imageUrl: '',
                    venueCount: city.venue_count,
                    gallery_images: city.gallery_images
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No cities found</h3>
            <p className="text-findvenue-text-muted mb-6">
              Try adjusting your search term
            </p>
            <Button 
              variant="outline" 
              className="border-white/10"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const CitySkeleton = () => (
  <Card className="overflow-hidden h-full bg-findvenue-card-bg border-white/10">
    <Skeleton className="h-48 w-full" />
    <CardContent className="p-4">
      <Skeleton className="h-6 w-1/2 mb-2" />
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

export default Cities;
