
import { useState, useEffect } from 'react';
import { useRealTimeVenues } from '@/hooks/useRealTimeVenues';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { MapPin, Search, X } from 'lucide-react';

const HomePageMap = () => {
  const { venues, categories } = useRealTimeVenues();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(50);

  const handleSearch = () => {
    // For demonstration purposes, just log the search criteria
    console.log('Searching with criteria:', {
      searchTerm,
      selectedCategory,
      guestCount
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setGuestCount(50);
  };
  
  // Update the selected venues when the venues data changes
  useEffect(() => {
    if (venues && venues.length > 0) {
      // For demonstration, select the first venue by default
      const venueIds = venues.slice(0, 3).map(venue => venue.id);
      // Use type assertion to tell TypeScript these are string[]
      setSelectedVenues(venueIds as string[]);
    }
  }, [venues]);

  return (
    <div className="relative h-[500px] w-full rounded-lg border overflow-hidden bg-black bg-opacity-30 backdrop-blur-md">
      {/* Map Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900/30"></div>
      
      {/* Search Controls */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search venues..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Guest Count */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Guests: {guestCount}</span>
                <span>Max: 500</span>
              </div>
              <Slider
                value={[guestCount]}
                min={1}
                max={500}
                step={1}
                onValueChange={(values) => setGuestCount(values[0])}
              />
            </div>
            
            {/* Search Button */}
            <div className="flex space-x-2">
              <Button 
                className="flex-1 bg-findvenue hover:bg-findvenue-dark"
                onClick={handleSearch}
              >
                Find Venues
              </Button>
              <Button 
                size="icon" 
                variant="outline"
                onClick={clearFilters}
                className="bg-transparent border-white/20 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Selected Venues */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
          {venues.slice(0, 4).map((venue) => (
            <div 
              key={venue.id}
              className="min-w-[250px] snap-center"
            >
              <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all">
                <div className="h-32 relative">
                  <img 
                    src={venue.imageUrl || '/placeholder.svg'} 
                    alt={venue.name} 
                    className="w-full h-full object-cover"
                  />
                  {venue.featured && (
                    <div className="absolute top-2 left-2 bg-findvenue text-white text-xs px-1.5 py-0.5 rounded">
                      Featured
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm truncate">{venue.name}</h3>
                  <div className="flex items-center text-gray-300 text-xs mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{venue.address}, {venue.city}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-findvenue-light text-xs">
                      {venue.capacity?.min}-{venue.capacity?.max} guests
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-white/10">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePageMap;
