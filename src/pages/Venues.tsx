
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import VenuesList from '@/components/venues/VenuesList';
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, cities } = useSupabaseVenues();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get filter parameters from URL
  const categoryId = searchParams.get('categoryId');
  const cityId = searchParams.get('cityId');
  const hasFilters = searchParams.toString().length > 0;
  
  // Find category/city names for display
  const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : '';
  const cityName = cityId ? cities.find(c => c.id === cityId)?.name : '';
  
  // Set page title based on filters
  useEffect(() => {
    if (categoryName && cityName) {
      document.title = `${categoryName} venues in ${cityName} | FindVenue`;
    } else if (categoryName) {
      document.title = `${categoryName} venues | FindVenue`;
    } else if (cityName) {
      document.title = `Venues in ${cityName} | FindVenue`;
    } else {
      document.title = 'All Venues | FindVenue';
    }
  }, [categoryName, cityName]);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('search', searchTerm.trim());
      setSearchParams(newParams);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchTerm('');
  };
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {categoryName && `${categoryName} `}
            {cityName ? `Venues in ${cityName}` : categoryName ? 'Venues' : 'All Venues'}
          </h1>
          <p className="text-findvenue-text-muted">
            {hasFilters 
              ? `Browse our collection of venues${categoryName ? ` for ${categoryName.toLowerCase()}` : ''}${cityName ? ` in ${cityName}` : ''}`
              : 'Browse our collection of premium venues for your next event'
            }
          </p>
        </div>
        
        {/* Search bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search venues by name, features, or location..."
                className="pl-10 bg-findvenue-surface/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" className="bg-findvenue hover:bg-findvenue-dark">
              Search
            </Button>
            {hasFilters && (
              <Button variant="outline" className="border-white/10" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </form>
        </div>
        
        <VenuesList />
      </div>
    </div>
  );
};

export default Venues;
