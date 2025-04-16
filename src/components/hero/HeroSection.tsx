
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Users, Calendar, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealTimeVenues } from '@/hooks/useRealTimeVenues';
import { Input } from '@/components/ui/input';

interface HeroSectionProps {
  onExploreMap?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onExploreMap }) => {
  const navigate = useNavigate();
  const { venues, cities, categories } = useRealTimeVenues();
  const [cityId, setCityId] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [guests, setGuests] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Extract unique venue types from venues data
  const venueTypes = React.useMemo(() => {
    const typesSet = new Set<string>();
    
    venues.forEach(venue => {
      if (venue.type) {
        typesSet.add(venue.type);
      }
    });
    
    return Array.from(typesSet).sort();
  }, [venues]);
  
  const handleSearch = () => {
    const searchParams = new URLSearchParams();
    
    if (cityId) searchParams.append('cityId', cityId);
    if (type) searchParams.append('type', type);
    if (categoryId) searchParams.append('categoryId', categoryId);
    if (guests) searchParams.append('guests', guests);
    if (searchTerm) searchParams.append('search', searchTerm);
    
    navigate(`/venues?${searchParams.toString()}`);
  };
  
  return (
    <div className="relative min-h-[500px] md:min-h-[650px] bg-gradient-to-r from-indigo-500 to-purple-700 flex flex-col items-center justify-center px-4 py-20">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />
        <img
          src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80"
          alt="Hero background"
          className="w-full h-full object-cover"
          style={{ opacity: 0.6 }}
        />
      </div>
      
      <div className="w-full max-w-5xl mx-auto text-center z-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
          Find the Perfect Venue For Your Event
        </h1>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          Discover and book amazing venues for weddings, conferences, parties and more with our simple search.
        </p>
        
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center bg-gray-50 rounded-md pl-3">
              <Search className="w-5 h-5 text-gray-500" />
              <Input
                type="text"
                placeholder="Search venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="bg-gray-50">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Location" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-gray-50">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-gray-50">
                  <SelectValue placeholder="Venue Type" />
                </SelectTrigger>
                <SelectContent>
                  {venueTypes.map((venueType) => (
                    <SelectItem key={venueType} value={venueType}>
                      {venueType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="bg-gray-50">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Guests" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Up to 10 guests</SelectItem>
                  <SelectItem value="25">Up to 25 guests</SelectItem>
                  <SelectItem value="50">Up to 50 guests</SelectItem>
                  <SelectItem value="100">Up to 100 guests</SelectItem>
                  <SelectItem value="250">Up to 250 guests</SelectItem>
                  <SelectItem value="500">Up to 500 guests</SelectItem>
                  <SelectItem value="1000">Up to 1000 guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="default" 
              className="whitespace-nowrap min-w-[120px]"
              onClick={handleSearch}
            >
              Search
            </Button>
          </div>
        </div>
        
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            variant="outline"
            className="bg-white/20 hover:bg-white/30 border-white/40 text-white"
            onClick={onExploreMap}
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            Explore on Map
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
