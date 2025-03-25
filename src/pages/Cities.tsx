
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const Cities = () => {
  const [cities, setCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('city_groups')
          .select('*')
          .order('venue_count', { ascending: false });
          
        if (error) throw error;
        
        setCities(data.map(city => ({
          id: city.city_id,
          name: city.city_name,
          image_url: city.image_url,
          venue_count: city.venue_count
        })) || []);
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCities();
  }, []);
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Explore Cities</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto">
            Discover venue options in cities across Saudi Arabia
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <CitySkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cities.map((city) => (
              <Link 
                key={city.id}
                to={`/?cityId=${city.id}`}
                className="block h-full"
              >
                <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02] bg-findvenue-card-bg border-white/10">
                  <div className="relative h-48">
                    <img 
                      src={city.image_url || 'https://images.unsplash.com/photo-1531054871758-3b3d4a5b0fbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'}
                      alt={city.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center mb-1">
                        <MapPin className="h-4 w-4 text-findvenue mr-1" />
                        <h3 className="text-xl font-semibold text-white">{city.name}</h3>
                      </div>
                      <p className="text-sm text-white/80">
                        {city.venue_count} venues available
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Button variant="outline" className="w-full border-findvenue text-findvenue hover:bg-findvenue/10">
                      View Venues
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
