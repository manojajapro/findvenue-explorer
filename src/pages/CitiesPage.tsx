
import { useState } from 'react';
import { useCities } from '@/hooks/useSupabaseData';
import CityCard from '@/components/ui/CityCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Search } from 'lucide-react';

const CitiesPage = () => {
  const { cities, loading } = useCities();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFeatured, setShowFeatured] = useState(false);
  
  // Filter cities based on search term and featured filter
  const filteredCities = cities.filter(city => {
    const matchesSearch = city.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFeatured = showFeatured ? city.featured : true;
    return matchesSearch && matchesFeatured;
  });

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Explore Cities</h1>
          <p className="text-findvenue-text-muted max-w-2xl mx-auto">
            Discover venue options in cities across Saudi Arabia
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-findvenue-text-muted h-4 w-4" />
            <Input
              placeholder="Search cities..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowFeatured(!showFeatured)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              showFeatured 
                ? 'bg-findvenue text-white' 
                : 'bg-findvenue-surface/50 text-findvenue-text-muted'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Featured Cities</span>
          </button>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredCities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCities.map((city) => (
              <div key={city.id} className="h-full">
                <CityCard city={{
                  id: city.id,
                  name: city.name,
                  imageUrl: city.image_url,
                  venueCount: city.venue_count,
                  featured: city.featured
                }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No cities found</h3>
            <p className="text-findvenue-text-muted">
              Try adjusting your search or check back later for more cities
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitiesPage;
